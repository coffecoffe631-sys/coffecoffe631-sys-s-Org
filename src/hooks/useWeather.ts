import { useState, useEffect } from 'react';

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  loading: boolean;
  error: string | null;
  isCustom?: boolean;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(() => {
    // Try to load simulated/saved weather from localStorage
    try {
      const saved = localStorage.getItem('weather_override');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          loading: false,
          error: null,
          isCustom: true
        };
      }
    } catch (e) {
      console.error("Error reading weather override:", e);
    }

    return {
      temp: 20,
      condition: 'Ensolarado',
      location: 'Belo Horizonte',
      loading: true,
      error: null
    };
  });

  const saveWeatherOverride = (newWeather: Partial<WeatherData>) => {
    setWeather(prev => {
      const updated = {
        ...prev,
        ...newWeather,
        loading: false,
        error: null,
        isCustom: true
      };
      localStorage.setItem('weather_override', JSON.stringify({
        temp: updated.temp,
        condition: updated.condition,
        location: updated.location
      }));
      return updated;
    });
  };

  const clearWeatherOverride = () => {
    localStorage.removeItem('weather_override');
    window.location.reload(); // Quick reset to trigger auto-detection
  };

  useEffect(() => {
    // If we already have a loaded custom override from localStorage, we don't overwrite it with live detection
    if (weather.isCustom) {
      return;
    }

    let isMounted = true;

    async function detectWeather() {
      // 1. Try our server-side API endpoint first (highly reliable, no CORS or adblocker blocks)
      try {
        const response = await fetch('/api/weather');
        if (response.ok) {
          const data = await response.json();
          if (data && isMounted) {
            setWeather({
              temp: data.temp,
              condition: data.condition,
              location: data.location,
              loading: false,
              error: null
            });
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch server-side weather, trying browser geolocation:", err);
      }

      // 2. Fallback to browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              let city = 'Sua Localização';
              
              // Corrected parameter lon instead of longitude
              try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const geoData = await geoRes.json();
                city = geoData.address.city || geoData.address.town || geoData.address.village || 'Sua Localização';
              } catch (e) {
                console.error("OpenStreetMap Nominatim error:", e);
              }

              const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
              const data = await res.json();
              
              if (data && data.current_weather && isMounted) {
                const current = data.current_weather;
                const code = current.weathercode;
                const isDay = current.is_day === 1;
                
                let condition = isDay ? 'Ensolarado' : 'Noite Limpa';
                if (code === 0) {
                  condition = isDay ? 'Ensolarado' : 'Noite Limpa';
                } else if (code <= 3) {
                  condition = isDay ? 'Parcialmente Nublado' : 'Noite com Nuvens';
                } else if (code >= 51 && code <= 67) {
                  condition = 'Chuvoso';
                } else if (code >= 71 && code <= 77) {
                  condition = 'Nevando';
                } else if (code >= 80) {
                  condition = 'Tempestade';
                }

                setWeather({
                  temp: Math.round(current.temperature),
                  condition,
                  location: city,
                  loading: false,
                  error: null
                });
              }
            } catch (err) {
              console.error("Browser geolocation fetch error:", err);
              if (isMounted) {
                setWeather({ 
                  temp: 14, 
                  condition: "Noite Limpa", 
                  location: "Jaboticabal, SP", 
                  loading: false, 
                  error: null 
                });
              }
            }
          },
          (geoErr) => {
            console.warn("Browser geolocation permission denied or unavailable:", geoErr);
            if (isMounted) {
              setWeather({ 
                temp: 14, 
                condition: "Noite Limpa", 
                location: "Jaboticabal, SP", 
                loading: false, 
                error: null 
              });
            }
          }
        );
      } else {
        if (isMounted) {
          setWeather({ 
            temp: 14, 
            condition: "Noite Limpa", 
            location: "Jaboticabal, SP", 
            loading: false, 
            error: null 
          });
        }
      }
    }

    detectWeather();

    return () => {
      isMounted = false;
    };
  }, [weather.isCustom]);

  return {
    ...weather,
    saveWeatherOverride,
    clearWeatherOverride
  };
}
