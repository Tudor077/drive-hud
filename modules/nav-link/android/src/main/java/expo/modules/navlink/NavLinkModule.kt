package expo.modules.navlink

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NavLinkModule : Module() {
  /** Lets [NavBus] reach the protected `sendEvent` from the listener service. */
  fun emit(name: String, body: Map<String, Any?>) = sendEvent(name, body)

  override fun definition() = ModuleDefinition {
    Name("NavLink")

    Events("onNavigationUpdate", "onNavigationCleared")

    OnCreate {
      NavBus.module = this@NavLinkModule
    }

    OnDestroy {
      if (NavBus.module === this@NavLinkModule) {
        NavBus.module = null
      }
    }

    Function("isSupported") { true }

    /**
     * Notification access is granted from a dedicated Settings screen, never
     * from a runtime permission dialog, so there is nothing to "request" here.
     */
    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    Function("openPermissionSettings") {
      val context = appContext.reactContext ?: return@Function false
      context.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
      true
    }

    Function("getLastInstruction") { NavBus.last }
  }
}
