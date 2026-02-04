/**
 * Type declarations for tz-lookup package.
 */
declare module 'tz-lookup' {
  /**
   * Look up the IANA timezone identifier for a given latitude/longitude.
   *
   * @param latitude Latitude in degrees (-90 to 90)
   * @param longitude Longitude in degrees (-180 to 180)
   * @returns IANA timezone string (e.g., "America/New_York")
   */
  function tzLookup(latitude: number, longitude: number): string;
  export = tzLookup;
}
