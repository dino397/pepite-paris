import { useEffect, useState } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer } from "lucide-react";

interface WeatherDay {
  date: string;
  description: string;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  weatherCode: number;
}

interface WeatherData {
  saturday: WeatherDay | null;
  sunday: WeatherDay | null;
  city: string;
}

interface WeatherWidgetProps {
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  onWeatherLoaded?: (data: WeatherData) => void;
}

function getWeatherIcon(code: number, size = 20) {
  if (code <= 1) return <Sun size={size} className="text-warm-gold" />;
  if (code <= 3) return <Cloud size={size} className="text-muted-foreground" />;
  if (code <= 67) return <CloudRain size={size} className="text-sky-blue" />;
  if (code <= 77) return <CloudSnow size={size} className="text-sky-blue" />;
  if (code <= 82) return <CloudRain size={size} className="text-sky-blue" />;
  return <Wind size={size} className="text-muted-foreground" />;
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Ciel dégagé ☀️";
  if (code === 1) return "Peu nuageux";
  if (code === 2) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if (code <= 49) return "Brouillard";
  if (code <= 57) return "Bruine";
  if (code <= 67) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 95) return "Orage";
  return "Conditions variables";
}

// Geocoding using nominatim
async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=fr`,
      { headers: { "User-Agent": "WeekendFamilleApp/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}

export default function WeatherWidget({ city, latitude, longitude, onWeatherLoaded }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      try {
        let lat = latitude;
        let lon = longitude;

        if (!lat || !lon) {
          const geo = await geocodeCity(city);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
          } else {
            // Default to Paris if not found
            lat = 48.8566;
            lon = 2.3522;
          }
        }

        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FParis&forecast_days=7`
        );
        const data = await res.json();

        // Find upcoming Saturday and Sunday
        const now = new Date();
        const days = data.daily.time as string[];

        const saturdayIdx = days.findIndex((d) => {
          const date = new Date(d);
          return date.getDay() === 6 && date >= now;
        });
        const sundayIdx = saturdayIdx >= 0 ? saturdayIdx + 1 : -1;

        const makeDay = (idx: number): WeatherDay | null => {
          if (idx < 0 || idx >= days.length) return null;
          const code = data.daily.weather_code[idx];
          return {
            date: days[idx],
            description: getWeatherDescription(code),
            tempMin: Math.round(data.daily.temperature_2m_min[idx]),
            tempMax: Math.round(data.daily.temperature_2m_max[idx]),
            precipProb: data.daily.precipitation_probability_max[idx] || 0,
            weatherCode: code,
          };
        };

        const weatherData: WeatherData = {
          saturday: makeDay(saturdayIdx),
          sunday: makeDay(sundayIdx),
          city,
        };

        setWeather(weatherData);
        onWeatherLoaded?.(weatherData);
      } catch {
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }

    if (city) fetchWeather();
  }, [city, latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-blue/10 to-primary/5 rounded-xl border border-sky-blue/20 p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="flex gap-4">
          <div className="h-12 w-28 bg-muted rounded-lg" />
          <div className="h-12 w-28 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const DayCard = ({ day, label }: { day: WeatherDay; label: string }) => (
    <div className="flex items-center gap-3 bg-card/80 rounded-xl px-4 py-3 border border-border/50 flex-1">
      {getWeatherIcon(day.weatherCode, 24)}
      <div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        <div className="text-sm font-semibold text-foreground">{day.description}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Thermometer className="h-3 w-3" />
          <span>{day.tempMin}° / <span className="font-semibold text-foreground">{day.tempMax}°</span></span>
          {day.precipProb > 30 && <span className="ml-1 text-sky-blue">💧 {day.precipProb}%</span>}
        </div>
      </div>
    </div>
  );

  const sat = weather.saturday;
  const sun = weather.sunday;

  // Format date labels
  const formatLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="bg-gradient-to-r from-sky-blue/10 to-primary/5 rounded-xl border border-sky-blue/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🌤️</span>
        <span className="text-sm font-semibold text-foreground uppercase tracking-wide">Météo du week-end</span>
        <span className="text-xs text-muted-foreground">— {city}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {sat && <DayCard day={sat} label={formatLabel(sat.date)} />}
        {sun && <DayCard day={sun} label={formatLabel(sun.date)} />}
      </div>
    </div>
  );
}
