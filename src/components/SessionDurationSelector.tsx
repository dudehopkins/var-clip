import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface SessionDurationSelectorProps {
  onDurationSelect: (minutes: number | null) => void;
}

export const SessionDurationSelector = ({ onDurationSelect }: SessionDurationSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");

  const presets = [
    { label: "1m", minutes: 1 },
    { label: "2m", minutes: 2 },
    { label: "5m", minutes: 5 },
    { label: "10m", minutes: 10 },
    { label: "15m", minutes: 15 },
    { label: "30m", minutes: 30 },
    { label: "1hr", minutes: 60 },
  ];

  const handlePresetClick = (preset: { label: string; minutes: number }) => {
    setSelectedPreset(preset.label);
    setCustomDays("");
    setCustomHours("");
    setCustomMinutes("");
    onDurationSelect(preset.minutes);
  };

  const handleCustomClick = () => {
    setSelectedPreset("custom");
    const days = parseInt(customDays) || 0;
    const hours = parseInt(customHours) || 0;
    const minutes = parseInt(customMinutes) || 0;
    
    const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
    
    if (totalMinutes > 0) {
      onDurationSelect(totalMinutes);
    } else {
      onDurationSelect(null);
    }
  };

  const handleNeverExpire = () => {
    setSelectedPreset("never");
    setCustomDays("");
    setCustomHours("");
    setCustomMinutes("");
    onDurationSelect(null);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Session Duration
      </Label>
      
      {/* Preset Durations */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            size="sm"
            variant={selectedPreset === preset.label ? "default" : "outline"}
            onClick={() => handlePresetClick(preset)}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={selectedPreset === "never" ? "default" : "outline"}
          onClick={handleNeverExpire}
          className="text-xs"
        >
          Never
        </Button>
      </div>

      {/* Custom Duration */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Custom Duration</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Days"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              min="0"
              className="text-xs"
            />
          </div>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Hours"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              min="0"
              max="23"
              className="text-xs"
            />
          </div>
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Min"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              min="0"
              max="59"
              className="text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant={selectedPreset === "custom" ? "default" : "outline"}
            onClick={handleCustomClick}
          >
            Set
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Session will be automatically deleted after expiration
      </p>
    </div>
  );
};
