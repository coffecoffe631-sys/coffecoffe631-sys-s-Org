import { useState, useEffect } from 'react';

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  loading: boolean;
  error: string | null;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 20,
    condition: 'Ensolarado',
    location: 'Belo Horizonte',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeather(prev => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Using Open-Meteo for free weather data
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          
          // Reverse geocoding for city name (optional, using a simple one or placeholder)
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await geoRes.json();
          const city = geoData.address.city || geoData.address.town || geoData.address.village || 'Sua Localização';

          const code = data.current_weather.weathercode;
          let condition = 'Nublado';
          if (code === 0) condition = 'Ensolarado';
          else if (code <= 3) condition = 'Parcialmente Nublado';
          else if (code >= 51 && code <= 67) condition = 'Chuvoso';
          else if (code >= 71 && code <= 77) condition = 'Nevando';
          else if (code >= 80) condition = 'Tempestade';

          setWeather({
            temp: Math.round(data.current_weather.temperature),
            condition,
            location: city,
            loading: false,
            error: null
          });
        } catch (err) {
          setWeather(prev => ({ ...prev, loading: false, error: 'Failed to fetch weather' }));
        }
      },
      (err) => {
        setWeather(prev => ({ ...prev, loading: false, error: 'Permission denied' }));
      }
    );
  }, []);

  return weather;
}
