import { Component } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { AgentService } from '../../services/agent.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [
    NgxMaterialTimepickerModule,
    FormsModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatGridListModule,
  ],
  templateUrl: './agent-form.component.html',
  styleUrl: './agent-form.component.css',
})
export class AgentFormComponent {
  agentForm!: FormGroup;
  agentTypes: string[] = ['Agent', 'TravelOwner'];

  constructor(
    private _fb: FormBuilder,
    private _agetnservice: AgentService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {
    this.agentForm = this._fb.group({
      name: '',
      contactNumber: '',
      email: '',
      agentType: '',
    });
  }
  onAgentFormSubmit() {
    this._agetnservice.addAgetn(this.agentForm.value).subscribe({
      next: (res) => {
        this._toastr.success('Agent added successfully', 'Success');
        this.agentForm.reset();
      },
      error: (err) => {
        this._toastr.error('Error adding agent', err);
      },
    });
    this._dialog.closeAll();
    this.agentForm.reset();
  }
  clossAgent() {
    this._dialog.closeAll();
  }
}
