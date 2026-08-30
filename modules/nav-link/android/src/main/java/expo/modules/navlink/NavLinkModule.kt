package expo.modules.navlink

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NavLinkModule : Module() {
  /** Lets [NavBus] reach the protected `sendEvent` from the listener service. */
  fun emit(name: String, body: Map<String, Any?>) = sendEvent(name, body)

  private fun notificationManager(): NotificationManager? =
    appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

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

    /**
     * Whether Android has actually bound the listener. Distinguishes "no
     * navigation is running" from "access was granted but the service never
     * started", which otherwise look identical from JS.
     */
    Function("isConnected") { NavBus.connected }

    /**
     * Do Not Disturb, used to stop navigation and message banners dropping over
     * the HUD while driving.
     *
     * It suppresses the *display* of a notification, not its posting, so the
     * listener above keeps receiving Waze and Maps exactly as before and the
     * road view carries on. That is why this rather than a vendor "game mode",
     * which would mean declaring a head-up display to be a game and would only
     * work on the handsets whose maker shipped one.
     */
    Function("hasQuietAccess") {
      notificationManager()?.isNotificationPolicyAccessGranted ?: false
    }

    Function("openQuietSettings") {
      val context = appContext.reactContext ?: return@Function false
      context.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
      true
    }

    Function("setQuiet") { enabled: Boolean ->
      val manager = notificationManager() ?: return@Function false
      if (!manager.isNotificationPolicyAccessGranted) return@Function false

      if (enabled) {
        // Remember what the driver had before, so leaving the app puts their
        // phone back exactly as they left it rather than merely un-muted.
        if (NavBus.filterBeforeQuiet == null) {
          NavBus.filterBeforeQuiet = manager.currentInterruptionFilter
        }
        manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
      } else {
        manager.setInterruptionFilter(
          NavBus.filterBeforeQuiet ?: NotificationManager.INTERRUPTION_FILTER_ALL
        )
        NavBus.filterBeforeQuiet = null
      }
      true
    }
  }
}
