import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { color } from '@/styles/tokens';

export default function OutfitSurvey({ settings, onUpdate }) {
  
  const handleUpdate = (updates) => {
    onUpdate({ ...settings, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Outfit Inspiration Survey</CardTitle>
        <p className="text-xs" style={{ color: color.textMuted }}>
          Collect outfit ideas from your guests to create a fun, collaborative lookbook!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="outfit_survey_enabled"
            checked={settings.outfit_survey_enabled || false}
            onCheckedChange={(checked) => handleUpdate({ outfit_survey_enabled: !!checked })}
          />
          <label htmlFor="outfit_survey_enabled" className="text-sm font-medium">
            Enable Outfit Survey
          </label>
        </div>

        {settings.outfit_survey_enabled && (
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="outfit_survey_question">Survey Question</Label>
            <Textarea
              id="outfit_survey_question"
              value={settings.outfit_survey_question || ''}
              onChange={(e) => handleUpdate({ outfit_survey_question: e.target.value })}
              placeholder="e.g., What are you planning to wear? Share your style!"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}