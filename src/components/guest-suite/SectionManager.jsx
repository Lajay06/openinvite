import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SECTION_LABELS = {
  ceremony: 'Ceremony Details',
  reception: 'Reception Details',
  attire: 'Dress Code',
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  gifts: 'Gift Registry',
  childrenPolicy: 'Children Policy',
  plusOnePolicy: 'Plus One Policy',
  contact: 'Contact Information',
  preWeddingEvents: 'Pre-Wedding Events',
  postWeddingEvents: 'Post-Wedding Events'
};

export default function SectionManager({ settings, onUpdate }) {
  const handleSectionToggle = (sectionKey, enabled) => {
    onUpdate({
      ...settings,
      enabled_sections: {
        ...settings.enabled_sections,
        [sectionKey]: enabled
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Main Events</CardTitle>
          <p className="text-xs text-gray-500">Configure primary event information</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(settings.main_event_order || []).map((sectionKey) => (
              <div key={sectionKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`section-${sectionKey}`}
                    checked={settings.enabled_sections?.[sectionKey] || false}
                    onCheckedChange={(checked) => handleSectionToggle(sectionKey, !!checked)}
                  />
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <label htmlFor={`section-${sectionKey}`} className="text-sm font-medium">{SECTION_LABELS[sectionKey] || sectionKey}</label>
                </div>
                <Badge variant={settings.enabled_sections?.[sectionKey] ? 'default' : 'secondary'}>
                  {settings.enabled_sections?.[sectionKey] ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Additional Information</CardTitle>
          <p className="text-xs text-gray-500">Configure additional details for guests</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(settings.additional_info_order || []).map((sectionKey) => (
              <div key={sectionKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`section-${sectionKey}`}
                    checked={settings.enabled_sections?.[sectionKey] || false}
                    onCheckedChange={(checked) => handleSectionToggle(sectionKey, !!checked)}
                  />
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <label htmlFor={`section-${sectionKey}`} className="text-sm font-medium">{SECTION_LABELS[sectionKey] || sectionKey}</label>
                </div>
                <Badge variant={settings.enabled_sections?.[sectionKey] ? 'default' : 'secondary'}>
                  {settings.enabled_sections?.[sectionKey] ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}