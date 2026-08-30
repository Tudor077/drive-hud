package expo.modules.navlink

/**
 * Bridge between the notification listener service and the Expo module.
 *
 * Both live in the same process, so a plain object is enough: the service posts
 * whatever the navigation app put in its notification, and the module forwards
 * it to JS. Parsing happens on the JS side, where it is easy to iterate on the
 * wording of each app and each language.
 */
object NavBus {
  /**
   * Navigation apps whose notifications we read. Anything else is ignored, so
   * the listener never forwards messages, mail or chat notifications.
   */
  private val NAV_PACKAGES = setOf(
    "com.waze",
    "com.google.android.apps.maps",
    "com.google.android.apps.navlite",
    "net.osmand",
    "net.osmand.plus",
    "com.sygic.aura",
    "com.tomtom.gplay.navapp",
    "cz.seznam.mapy",
    "com.mapswithme.maps.pro"
  )

  @Volatile
  var module: NavLinkModule? = null

  @Volatile
  var last: Map<String, Any?>? = null

  @Volatile
  var connected: Boolean = false

  /** The driver's own interruption filter, kept so it can be handed back. */
  @Volatile
  var filterBeforeQuiet: Int? = null

  fun isNavPackage(packageName: String) = NAV_PACKAGES.contains(packageName)

  fun update(body: Map<String, Any?>) {
    last = body
    module?.emit("onNavigationUpdate", body)
  }

  fun clear(packageName: String) {
    last = null
    module?.emit("onNavigationCleared", mapOf("package" to packageName))
  }
}
