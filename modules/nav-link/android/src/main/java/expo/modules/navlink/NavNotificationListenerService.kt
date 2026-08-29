package expo.modules.navlink

import android.app.Notification
import android.os.Bundle
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
    val notification = sbn.notification ?: return
    val extras = notification.extras ?: Bundle()

    NavBus.update(
      mapOf(
        "package" to packageName,
        "title" to extras.text(Notification.EXTRA_TITLE),
        "text" to extras.text(Notification.EXTRA_TEXT),
        "subText" to extras.text(Notification.EXTRA_SUB_TEXT),
        "bigText" to extras.text(Notification.EXTRA_BIG_TEXT),
        "infoText" to extras.text(Notification.EXTRA_INFO_TEXT),
        "summaryText" to extras.text(Notification.EXTRA_SUMMARY_TEXT),
        "ticker" to notification.tickerText?.toString(),
        // Apps that draw their own notification layout leave the standard
        // fields empty and put the wording in extras of their own, under keys
        // only they know. Rather than guess at the names, hand over every
        // readable string and let the parser — and the debug screen — decide.
        "extras" to extras.readableStrings(),
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

private fun Bundle.text(key: String): String? = getCharSequence(key)?.toString()

/** Keys that only ever hold framework bookkeeping, never anything a driver reads. */
private val IGNORED_KEYS = setOf(
  "android.appInfo",
  "android.template",
  "android.icon",
  "android.largeIcon",
  "android.largeIcon.big",
  "android.contains.customView",
  "android.rebuild.applicationInfo",
  "android.support.v4.app.extra.COMPAT_TEMPLATE"
)

/** Longest string worth forwarding; notification extras can hold whole articles. */
private const val MAX_VALUE_LENGTH = 200

private fun Bundle.readableStrings(): Map<String, String> {
  val out = mutableMapOf<String, String>()
  for (key in keySet()) {
    if (key in IGNORED_KEYS) continue
    val value = try {
      @Suppress("DEPRECATION")
      get(key)
    } catch (_: Throwable) {
      null
    }

    val text = when (value) {
      is CharSequence -> value.toString()
      is Array<*> -> value.filterIsInstance<CharSequence>().joinToString(" · ")
      else -> null
    }

    if (!text.isNullOrBlank()) {
      out[key] = text.take(MAX_VALUE_LENGTH)
    }
  }
  return out
}
