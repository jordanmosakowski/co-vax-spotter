export interface VaxLocation{
  id: string
  address: string,
  provider: string,
  url: string,
  available: boolean,
  appointments: Appointment[],
  zip: string,
  city: string
  lastAvailable?: string,
}

export interface Appointment{
  time: string,
  type: string,
}

export interface Settings{
  enabled: boolean,
  checkLarge: boolean,
}
