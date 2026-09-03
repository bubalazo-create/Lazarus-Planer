export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    windSpeed: number;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    day: string;
    maxTemp: number;
    minTemp: number;
    condition: string;
    icon: string;
  }>;
}

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌧️' },
  53: { label: 'Moderate drizzle', icon: '🌧️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Light freezing drizzle', icon: '🌧️' },
  57: { label: 'Dense freezing drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌧️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Light freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Slight snow fall', icon: '🌨️' },
  73: { label: 'Moderate snow fall', icon: '🌨️' },
  75: { label: 'Heavy snow fall', icon: '🌨️' },
  77: { label: 'Snow grains', icon: '🌨️' },
  80: { label: 'Slight rain showers', icon: '🌦️' },
  81: { label: 'Moderate rain showers', icon: '🌦️' },
  82: { label: 'Violent rain showers', icon: '🌧️' },
  85: { label: 'Slight snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with slight hail', icon: '⛈️' },
  99: { label: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

export async function fetchMaltaWeather(): Promise<WeatherData> {
  try {
    const lat = 35.8997;
    const lon = 14.5147;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error');
    
    const data = await res.json();
    
    const currentCode = data.current.weather_code;
    const currentWmo = WMO_CODES[currentCode] || { label: 'Unknown', icon: '❓' };
    
    const forecast = [];
    // Skip today (index 0), get next 3 days
    for (let i = 1; i <= 3; i++) {
      if (!data.daily.time[i]) continue;
      
      const date = new Date(data.daily.time[i]);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const code = data.daily.weather_code[i];
      const wmo = WMO_CODES[code] || { label: 'Unknown', icon: '❓' };
      
      // Calculate average temp for display or use max
      const maxT = Math.round(data.daily.temperature_2m_max[i]);
      const minT = Math.round(data.daily.temperature_2m_min[i]);
      
      forecast.push({
        day: i === 1 ? 'Tomorrow' : dayName,
        maxTemp: maxT,
        minTemp: minT,
        condition: wmo.label,
        icon: wmo.icon,
      });
    }

    return {
      current: {
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        windSpeed: Math.round(data.current.wind_speed_10m),
        condition: currentWmo.label,
        icon: currentWmo.icon,
      },
      forecast,
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    throw error;
  }
}
