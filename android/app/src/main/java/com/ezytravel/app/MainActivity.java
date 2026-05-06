// package com.example.app;

// import com.getcapacitor.BridgeActivity;

// public class MainActivity extends BridgeActivity {
    
//     @Override
//     protected void onCreate(Bundle savedInstanceState) {
//         super.onCreate(savedInstanceState);

//         WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
//     }
// }

package com.ezytravel.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    System.out.println("FCM token fetch failed: " + task.getException());
                    return;
                }

                String token = task.getResult();
                System.out.println("FCM Token: " + token);
            });
    }
}
