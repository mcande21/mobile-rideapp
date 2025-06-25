"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check, Palette, Image, User as UserIcon, Save, Loader2 } from "lucide-react";
import { AVATAR_COLORS, AVATAR_PATTERNS, getAvatarUrl, getAvatarBackgroundColor, getUserInitials } from "@/lib/utils";
import { User } from "@/lib/types";

interface AvatarSelectorProps {
  user: User;
  onSelect: (avatarConfig: { type: 'color' | 'preset' | 'google'; value: string }) => void;
  onSave: (avatarConfig: { type: 'color' | 'preset' | 'google'; value: string }) => Promise<void>;
}

export function AvatarSelector({ user, onSelect, onSave }: AvatarSelectorProps) {
  const [selectedType, setSelectedType] = useState<'color' | 'preset' | 'google'>(
    user.customAvatar?.type || 'color'
  );
  const [selectedValue, setSelectedValue] = useState<string>(
    user.customAvatar?.value || AVATAR_COLORS[0]
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (type: 'color' | 'preset' | 'google', value: string) => {
    setSelectedType(type);
    setSelectedValue(value);
    onSelect({ type, value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ type: selectedType, value: selectedValue });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = 
    selectedType !== user.customAvatar?.type || 
    selectedValue !== user.customAvatar?.value;

  const previewUser = {
    ...user,
    customAvatar: { type: selectedType, value: selectedValue }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Choose Your Avatar
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved Changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="flex items-center justify-center">
          <div className="text-center space-y-2">
            <Avatar className="h-20 w-20 mx-auto">
              <AvatarImage
                src={getAvatarUrl(previewUser)}
                alt={user.name}
              />
              <AvatarFallback 
                style={{ backgroundColor: getAvatarBackgroundColor(previewUser) }}
                className="text-white font-semibold text-xl relative overflow-hidden"
              >
                {selectedType === 'preset' ? (
                  <img 
                    src={`/patterns/${selectedValue}.svg`}
                    alt="Avatar"
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  getUserInitials(user.name)
                )}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">Preview</p>
          </div>
        </div>

        {/* Google Profile Picture Option */}
        {user.googleAccount?.picture && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <h3 className="font-medium">Google Profile Picture</h3>
              {selectedType === 'google' && <Badge variant="secondary">Selected</Badge>}
            </div>
            <Button
              variant={selectedType === 'google' ? 'default' : 'outline'}
              className="w-full justify-start gap-3"
              onClick={() => handleSelect('google', user.googleAccount!.picture)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.googleAccount.picture} alt="Google Profile" />
                <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
              </Avatar>
              Use Google Profile Picture
              {selectedType === 'google' && <Check className="h-4 w-4 ml-auto" />}
            </Button>
          </div>
        )}

        {/* Color Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <h3 className="font-medium">Color Backgrounds</h3>
            {selectedType === 'color' && <Badge variant="secondary">Selected</Badge>}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_COLORS.map((color) => (
              <Button
                key={color}
                variant="outline"
                className="h-14 w-14 p-0 rounded-full relative"
                style={{ backgroundColor: color }}
                onClick={() => handleSelect('color', color)}
              >
                <span className="text-white font-semibold text-sm">
                  {getUserInitials(user.name)}
                </span>
                {selectedType === 'color' && selectedValue === color && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Avatar Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <h3 className="font-medium">Avatar</h3>
            {selectedType === 'preset' && <Badge variant="secondary">Selected</Badge>}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_PATTERNS.map((pattern) => (
              <Button
                key={pattern}
                variant={selectedType === 'preset' && selectedValue === pattern ? 'default' : 'outline'}
                className="h-20 w-full relative overflow-hidden p-2 flex flex-col gap-1"
                onClick={() => handleSelect('preset', pattern)}
              >
                <div className="flex-1 flex items-center justify-center">
                  <img 
                    src={`/patterns/${pattern}.svg`}
                    alt={pattern.replace('-svgrepo-com', '').replace(/-/g, ' ')}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="text-xs font-medium truncate w-full">
                  {pattern.replace('-svgrepo-com', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {selectedType === 'preset' && selectedValue === pattern && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full"
          variant={hasChanges ? "default" : "secondary"}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Avatar...
            </>
          ) : hasChanges ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Avatar Saved
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
