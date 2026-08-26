package expo.modules.navlink

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Reads the ongoing notification that Waze, Google Maps and friends post while
 * they are giving turn-by-turn directions. That notification carries the next
 * manoeuvre and the distance to it, which is all a HUD needs.
 *
 * There is no public API to embed those apps, and no app may read another app's
 * notifications without the user granting notification access by hand, so this
 * stays dormant until they do.
 */
class NavNotificationListenerService : NotificationListenerService() {
  override fun onListenerConnected() {
    NavBus.connected = true
  }

  override fun onListenerDisconnected() {
    NavBus.connected = false
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (!NavBus.isNavPackage(packageName)) return
    val extras = sbn.notification?.extras ?: return

    NavBus.update(
      mapOf(
        "package" to packageName,
        "title" to extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
        "text" to extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
        "subText" to extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString(),
        "bigText" to extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
        "infoText" to extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString(),
        "postedAt" to sbn.postTime.toDouble(),
        "ongoing" to sbn.isOngoing
      )
    )
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (!NavBus.isNavPackage(packageName)) return
    NavBus.clear(packageName)
  }
}
