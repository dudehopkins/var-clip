import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clipboard, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const SessionLanding = () => {
  const navigate = useNavigate();
  const [customCode, setCustomCode] = useState("");

  const generateRandomCode = () => {
    const code = Math.random().toString(36).substring(2, 8);
    navigate(`/${code}`);
  };

  const handleCustomCode = () => {
    const code = customCode.trim().toLowerCase();
    
    if (!code) {
      toast.error("Please enter a session code");
      return;
    }
    
    if (code.length < 4 || code.length > 20) {
      toast.error("Session code must be between 4-20 characters");
      return;
    }
    
    if (!/^[a-z0-9]+$/.test(code)) {
      toast.error("Session code can only contain lowercase letters and numbers");
      return;
    }
    
    navigate(`/${code}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCustomCode();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 inline-block">
              <Clipboard className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Vars Clip</h1>
          <p className="text-muted-foreground">
            Real-time collaborative clipboard for text, images, and files
          </p>
        </div>

        <div className="space-y-6 bg-card border border-border rounded-xl p-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Create Custom Session
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter custom code (e.g., frdna)"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleCustomCode} size="icon">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              4-20 characters, lowercase letters and numbers only
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={generateRandomCode}
            className="w-full gap-2"
            variant="default"
          >
            <Sparkles className="w-4 h-4" />
            Generate Random Session
          </Button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Share the session link with others to collaborate in real-time
          </p>
        </div>
      </div>
    </div>
  );
};
