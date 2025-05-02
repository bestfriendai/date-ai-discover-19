
import { Event } from "@/types"
import { env } from "@/env.mjs"

export type Coordinate = {
  latitude: number
  longitude: number
}

export type EventFilters = {
  categories?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
  location?: string
  radius?: number
  keyword?: string
  page?: number
  limit?: number
  latitude?: number
  longitude?: number
}

const DEFAULT_EVENT_IMAGE = "/event-default.png"

const getApiUrl = () => {
  if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return env.NEXT_PUBLIC_API_URL
  }

  if (env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${env.NEXT_PUBLIC_VERCEL_URL}`
  }

  return "http://localhost:3000"
}

const constructQueryParams = (filters: EventFilters): string => {
  const params = new URLSearchParams()

  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((category) => params.append("categories", category))
  }

  if (filters.dateRange) {
    if (filters.dateRange.from) {
      params.append("startDate", filters.dateRange.from.toISOString())
    }
    if (filters.dateRange.to) {
      params.append("endDate", filters.dateRange.to.toISOString())
    }
  }

  if (filters.location) {
    params.append("location", filters.location)
  }

  if (filters.radius) {
    params.append("radius", filters.radius.toString())
  }

  if (filters.keyword) {
    params.append("keyword", filters.keyword)
  }

  if (filters.page) {
    params.append("page", filters.page.toString())
  }

  if (filters.limit) {
    params.append("limit", filters.limit.toString())
  }

  if (filters.latitude) {
    params.append("latitude", filters.latitude.toString())
  }

  if (filters.longitude) {
    params.append("longitude", filters.longitude.toString())
  }

  return params.toString()
}

export const fetchEvents = async (
  filters: EventFilters,
  coords?: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    let apiUrl = `${getApiUrl()}/api/events`
    const queryParams = constructQueryParams(filters)

    if (queryParams) {
      apiUrl += `?${queryParams}`
    }

    console.log("Fetching events from:", apiUrl)

    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      console.error("HTTP error!", res.status)
      return []
    }

    const data = (await res.json()) as Event[]

    return data
  } catch (error) {
    console.error("Could not fetch events!", error)
    return []
  }
}

export const fetchEventsFromSupabase = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing!")
      return []
    }

    let supabaseFunctionName = "search-events"

    if (env.NEXT_PUBLIC_USE_UNIFIED_FUNCTION === "true") {
      supabaseFunctionName = "search-events-unified"
    }

    const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/${supabaseFunctionName}`

    // Combine filters with coordinates
    const requestParams = {
      ...filters,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: radius || filters.radius || 10000 // Default to 10km if not specified
    }

    console.log("Fetching events from Supabase Function:", supabaseFunctionUrl)
    console.log("Request Parameters:", requestParams)

    const res = await fetch(supabaseFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(requestParams),
    })

    if (!res.ok) {
      console.error("HTTP error from Supabase Function!", res.status)
      const errorData = await res.json()
      console.error("Error details:", errorData)
      return []
    }

    const data = await res.json()

    if (data.error) {
      console.error("Supabase Function Error:", data.error)
      return []
    }

    let events: Event[] = []

    if (data.events && Array.isArray(data.events)) {
      events = data.events.map((event: any) => ({
        id: event.id || Math.random().toString(36).substring(2, 15),
        source: event.source || "unknown",
        title: event.title || "Untitled Event",
        description: event.description || "No description provided.",
        date: event.date || "Date not specified",
        time: event.time || "Time not specified",
        location: event.location || "Location not specified",
        venue: event.venue || "Venue not specified",
        category: event.category || "other",
        image: event.image || DEFAULT_EVENT_IMAGE,
        imageAlt: event.imageAlt || "Event Image",
        coordinates: event.coordinates || undefined,
        url: event.url || undefined,
        isPartyEvent: event.isPartyEvent || false,
        partySubcategory: event.partySubcategory || undefined,
        rawDate: event.rawDate || undefined,
        latitude: event.latitude || undefined,
        longitude: event.longitude || undefined,
      }))
    } else {
      console.warn("No events found or invalid format in Supabase Function response.")
    }

    console.log(`Fetched ${events.length} events from Supabase Function.`)
    return events
  } catch (error) {
    console.error("Could not fetch events from Supabase!", error)
    return []
  }
}

export const fetchEventsFromRapidAPI = async (
  filters: EventFilters,
  coords: Coordinate,
  radius?: number
): Promise<Event[]> => {
  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing!")
      return []
    }

    // Use the fetch-events edge function
    const fetchEventsFunctionName = "fetch-events"
    const fetchEventsFunctionUrl = `${supabaseUrl}/functions/v1/${fetchEventsFunctionName}`

    // Combine filters with coordinates
    const requestParams = {
      ...filters,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: radius || filters.radius || 10000 // Default to 10km if not specified
    }

    console.log("Fetching events from RapidAPI via Supabase Function:", fetchEventsFunctionUrl)
    console.log("Request Parameters:", requestParams)

    const res = await fetch(fetchEventsFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(requestParams),
    })

    if (!res.ok) {
      console.error("HTTP error from Supabase Function!", res.status)
      const errorData = await res.json()
      console.error("Error details:", errorData)
      return []
    }

    const data = await res.json()

    if (data.error) {
      console.error("Supabase Function Error:", data.error)
      return []
    }

    let events: Event[] = []

    if (data.events && Array.isArray(data.events)) {
      events = data.events.map((event: any) => ({
        id: event.id || Math.random().toString(36).substring(2, 15),
        source: event.source || "rapidapi",
        title: event.title || "Untitled Event",
        description: event.description || "No description provided.",
        date: event.date || "Date not specified",
        time: event.time || "Time not specified",
        location: event.location || "Location not specified",
        venue: event.venue || "Venue not specified",
        category: event.category || "other",
        image: event.image || DEFAULT_EVENT_IMAGE,
        imageAlt: event.imageAlt || "Event Image",
        coordinates: event.coordinates || undefined,
        url: event.url || undefined,
        isPartyEvent: event.isPartyEvent || false,
        partySubcategory: event.partySubcategory || undefined,
        rawDate: event.rawDate || undefined,
        latitude: event.latitude || undefined,
        longitude: event.longitude || undefined,
      }))
    } else {
      console.warn("No events found or invalid format in Supabase Function response.")
    }

    console.log(`Fetched ${events.length} events from RapidAPI via Supabase Function.`)
    return events
  } catch (error) {
    console.error("Could not fetch events from RapidAPI via Supabase!", error)
    return []
  }
}
