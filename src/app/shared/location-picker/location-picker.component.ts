import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface PickedLocation {
  name: string;
  lat: number;
  lng: number;
  mapsLink: string;
}

const RECENT_KEY = 'ezygoa_recent_locs_v2';
const MAX_RECENT = 5;

// Goa bounding box — biases Places results to Goa first
const GOA_BOUNDS = {
  north: 15.82,
  south: 14.88,
  east:  74.35,
  west:  73.65,
};

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.css',
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchText = '';
  isSearching = false;
  recentPicks: PickedLocation[] = [];
  selected: PickedLocation | null = null;
  mapReady = false;
  apiError = false;

  private gMap!: google.maps.Map;
  private gMarker?: google.maps.Marker;
  private gAutocomplete?: google.maps.places.Autocomplete;
  private gGeocoder?: google.maps.Geocoder;
  private clickListener?: google.maps.MapsEventListener;

  constructor(
    private zone: NgZone,
    private dialogRef: MatDialogRef<LocationPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { current: string; label: string }
  ) {}

  ngOnInit() {
    this.recentPicks = this.loadRecent();
    if (this.data.current) {
      this.searchText = this.data.current;
    }
  }

  ngAfterViewInit() {
    this.waitForGoogleAndInit();
  }

  ngOnDestroy() {
    if (this.clickListener) this.clickListener.remove();
    if (this.gAutocomplete) {
      google.maps.event.clearInstanceListeners(this.gAutocomplete);
    }
  }

  /** Poll until google.maps is ready (loaded with defer) */
  private waitForGoogleAndInit(attempts = 0) {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      this.initGoogleMap();
      this.initAutocomplete();
    } else if (attempts < 30) {
      setTimeout(() => this.waitForGoogleAndInit(attempts + 1), 300);
    } else {
      this.zone.run(() => { this.apiError = true; });
    }
  }

  private initGoogleMap() {
    const mapEl = document.getElementById('lp-map');
    if (!mapEl) return;

    this.gMap = new google.maps.Map(mapEl, {
      center: { lat: 15.4, lng: 73.9 },
      zoom: 11,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    this.gGeocoder = new google.maps.Geocoder();

    this.clickListener = this.gMap.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        this.zone.run(() => this.onMapClick(e.latLng!));
      }
    });

    this.zone.run(() => { this.mapReady = true; });
  }

  private initAutocomplete() {
    if (!this.searchInputRef?.nativeElement) return;

    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(GOA_BOUNDS.south, GOA_BOUNDS.west),
      new google.maps.LatLng(GOA_BOUNDS.north, GOA_BOUNDS.east)
    );

    this.gAutocomplete = new google.maps.places.Autocomplete(
      this.searchInputRef.nativeElement,
      {
        bounds,
        strictBounds: false,        // also allow outside Goa if user types it
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'name', 'formatted_address'],
      }
    );

    this.gAutocomplete.addListener('place_changed', () => {
      this.zone.run(() => this.onPlaceChanged());
    });
  }

  private onPlaceChanged() {
    if (!this.gAutocomplete) return;
    const place = this.gAutocomplete.getPlace();
    if (!place.geometry?.location) return;

    const lat  = place.geometry.location.lat();
    const lng  = place.geometry.location.lng();
    const name = place.name
      ? `${place.name}${place.formatted_address ? ', ' + place.formatted_address.replace(', India', '') : ''}`
      : (place.formatted_address ?? '');

    this.searchText = name;
    this.placePin(lat, lng, name);
    this.gMap.panTo({ lat, lng });
    this.gMap.setZoom(15);
  }

  private onMapClick(latLng: google.maps.LatLng) {
    const lat = latLng.lat();
    const lng = latLng.lng();
    this.placePin(lat, lng, 'Locating…');
    this.isSearching = true;

    this.gGeocoder?.geocode({ location: latLng }, (results, status) => {
      this.zone.run(() => {
        this.isSearching = false;
        if (status === 'OK' && results?.[0]) {
          const r = results[0];
          // Try to build a clean name: establishment > route > locality
          const comp = (type: string) =>
            r.address_components.find(c => c.types.includes(type))?.long_name;

          const name =
            comp('establishment') ??
            comp('point_of_interest') ??
            comp('route') ??
            comp('sublocality_level_1') ??
            comp('locality') ??
            r.formatted_address.replace(', India', '');

          const full = r.formatted_address.replace(', India', '');
          this.placePin(lat, lng, name === full ? name : `${name}, ${full}`);
          this.searchText = this.selected?.name ?? '';
        } else {
          const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          this.placePin(lat, lng, fallback);
          this.searchText = fallback;
        }
      });
    });
  }

  private placePin(lat: number, lng: number, name: string) {
    if (this.gMarker) this.gMarker.setMap(null);

    this.gMarker = new google.maps.Marker({
      position: { lat, lng },
      map: this.gMap,
      animation: google.maps.Animation.DROP,
      title: name,
    });

    this.selected = {
      name,
      lat,
      lng,
      mapsLink: `https://maps.google.com/?q=${lat},${lng}`,
    };
  }

  pickRecent(p: PickedLocation) {
    this.searchText = p.name;
    this.placePin(p.lat, p.lng, p.name);
    this.gMap.panTo({ lat: p.lat, lng: p.lng });
    this.gMap.setZoom(15);
  }

  confirmSelection() {
    if (!this.selected) return;
    this.saveRecent(this.selected);
    this.dialogRef.close(this.selected);
  }

  close() {
    this.dialogRef.close(null);
  }

  private loadRecent(): PickedLocation[] {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private saveRecent(loc: PickedLocation) {
    let list = this.loadRecent().filter(r => r.name !== loc.name);
    list.unshift(loc);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  }
}
