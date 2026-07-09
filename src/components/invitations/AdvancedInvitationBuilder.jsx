import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
    Plus, Image as ImageIcon, Type, Palette, Trash2, Search, AlignLeft,
    AlignCenter, AlignRight, Save, Settings, Layers, Calendar, MapPin, Clock, 
    Loader2, Eye, Users
} from 'lucide-react';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { InvokeLLM } from '@/integrations/Core';

const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro', 'Raleway', 'PT Sans',
    'Lora', 'Merriweather', 'Playfair Display', 'Cormorant Garamond', 'EB Garamond',
    'Dancing Script', 'Great Vibes', 'Pacifico', 'Lobster', 'Satisfy', 'Alex Brush',
    'Allura', 'Amatic SC', 'Caveat', 'Sacramento', 'Pinyon Script', 'Tangerine', 'Cookie', 'Kaushan Script'
];

const TRANSITION_TYPES = [
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'parallax', label: 'Parallax' },
    { value: 'none', label: 'None' }
];

const GRADIENT_PRESETS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
];

const generateInitialDesign = (data) => ({
    globalStyles: {
        fontFamily: data.template_style === 'modern' ? 'Inter' : 'Playfair Display',
        scrollDirection: 'vertical',
        transitionType: 'fade'
    },
    sections: [
        {
            id: 'section1',
            name: 'Hero',
            background: { type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', overlay: 'rgba(0,0,0,0.1)' },
            components: [
                { id: 'comp1', type: 'hero', content: { title: data.couple_names || 'Sarah & Michael', subtitle: 'are getting married' }, styles: { fontFamily: 'Playfair Display', fontSize: 48, color: '#ffffff', textAlign: 'center', padding: '60px 20px' } }
            ]
        },
        {
            id: 'section2',
            name: 'Details',
            background: { type: 'color', value: '#ffffff', overlay: 'rgba(0,0,0,0)' },
            components: [
                { id: 'comp2', type: 'details', content: { title: 'Ceremony', date: data.wedding_date, time: data.ceremony_time, venue: data.ceremony_venue }, styles: { fontFamily: 'Inter', fontSize: 16, color: '#555555', textAlign: 'center', padding: '40px 20px' } }
            ]
        },
        {
            id: 'section3',
            name: 'Message',
            background: { type: 'color', value: '#f8f9fa', overlay: 'rgba(0,0,0,0)' },
            components: [
                { id: 'comp3', type: 'text', content: { text: data.custom_message || 'Join us for a celebration of love, laughter, and happily ever after.' }, styles: { fontFamily: 'Inter', fontSize: 18, color: '#555555', textAlign: 'center', padding: '40px 20px' } }
            ]
        }
    ]
});

const AdvancedInvitationBuilder = ({ invitationData, onSave }) => {
    const [design, setDesign] = useState(invitationData.design && invitationData.design.sections ? invitationData.design : generateInitialDesign(invitationData));
    const [activeSection, setActiveSection] = useState(0);
    const [selectedComponentId, setSelectedComponentId] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [guestSuiteSettings, setGuestSuiteSettings] = useState(null);
    const [pexelsImages, setPexelsImages] = useState([]);
    const [imageSearchTerm, setImageSearchTerm] = useState('wedding');
    const [loadingImages, setLoadingImages] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const canvasRef = useRef(null);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=' + GOOGLE_FONTS.map(font => font.replace(/ /g, '+')).join('&family=') + '&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        const fetchData = async () => {
            try {
                const [details, guestSettings] = await Promise.all([
                    getMyWeddingDetails(),
                    getMyRecords('GuestSuiteSettings')
                ]);
                if(details) setEventDetails(details);
                if(guestSettings.length > 0) setGuestSuiteSettings(guestSettings[0]);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
        searchPexelsImages(imageSearchTerm);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(design);
            alert("Invitation saved successfully!");
        } catch (error) {
            alert("Failed to save invitation.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const updateComponent = (sectionId, componentId, newStyles = {}, newContent = {}) => {
        setDesign(prev => ({
            ...prev,
            sections: prev.sections.map(section => 
                section.id === sectionId ? {
                    ...section,
                    components: section.components.map(comp => 
                        comp.id === componentId ? {
                            ...comp,
                            styles: { ...comp.styles, ...newStyles },
                            content: { ...comp.content, ...newContent }
                        } : comp
                    )
                } : section
            )
        }));
    };

    const addSection = () => {
        const newSectionId = `section${Date.now()}`;
        const newSection = {
            id: newSectionId,
            name: `Section ${design.sections.length + 1}`,
            background: { type: 'color', value: '#ffffff', overlay: 'rgba(0,0,0,0)' },
            components: []
        };
        setDesign(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
        setActiveSection(design.sections.length);
    };

    const deleteSection = (sectionIndex) => {
        if (design.sections.length <= 1) return; // Keep at least one section
        setDesign(prev => ({
            ...prev,
            sections: prev.sections.filter((_, index) => index !== sectionIndex)
        }));
        if (activeSection >= sectionIndex && activeSection > 0) {
            setActiveSection(activeSection - 1);
        }
    };

    const addComponent = (type, content = {}, styles = {}) => {
        const activeSection = design.sections[this.activeSection];
        if (!activeSection) return;

        const newId = `comp${Date.now()}`;
        let newComponent;
        switch (type) {
            case 'text':
                newComponent = { 
                    id: newId, 
                    type: 'text', 
                    content: { text: 'New Text Block', ...content }, 
                    styles: { fontFamily: 'Inter', fontSize: 16, color: '#555555', textAlign: 'left', padding: '10px 20px', ...styles } 
                };
                break;
            case 'image':
                newComponent = { 
                    id: newId, 
                    type: 'image', 
                    content: { url: content.url || 'https://via.placeholder.com/400x200', alt: 'Image', ...content }, 
                    styles: { padding: '10px', objectFit: 'cover', width: '100%', height: '200px', borderRadius: '8px', ...styles } 
                };
                break;
            case 'hero':
                newComponent = {
                    id: newId,
                    type: 'hero',
                    content: { title: 'Your Title', subtitle: 'Your Subtitle', ...content },
                    styles: { fontFamily: 'Playfair Display', fontSize: 48, color: '#333333', textAlign: 'center', padding: '60px 20px', ...styles }
                };
                break;
            default: return;
        }
        
        setDesign(prev => ({
            ...prev,
            sections: prev.sections.map((section, index) => 
                index === activeSection ? {
                    ...section,
                    components: [...section.components, newComponent]
                } : section
            )
        }));
    };

    const deleteComponent = (sectionId, componentId) => {
        setDesign(prev => ({
            ...prev,
            sections: prev.sections.map(section => 
                section.id === sectionId ? {
                    ...section,
                    components: section.components.filter(c => c.id !== componentId)
                } : section
            )
        }));
        setSelectedComponentId(null);
    };

    const updateSectionBackground = (sectionIndex, background) => {
        setDesign(prev => ({
            ...prev,
            sections: prev.sections.map((section, index) => 
                index === sectionIndex ? { ...section, background } : section
            )
        }));
    };

    const searchPexelsImages = async (query) => {
        if(!query.trim()) return;
        setLoadingImages(true);
        setPexelsImages([]);
        try {
            const response = await InvokeLLM({
                prompt: `Search Pexels for "${query}" and return 12 high-quality images. For each image, provide:
                - id: unique identifier
                - url: direct image URL (preferably medium size, around 400-600px wide)
                - alt: descriptive alt text
                Make sure the URLs are actual image URLs that can be displayed in img tags.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        images: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    url: { type: "string", format: "uri" },
                                    alt: { type: "string" }
                                },
                                required: ["id", "url", "alt"]
                            }
                        }
                    }
                }
            });
            if (response.images && Array.isArray(response.images)) {
                setPexelsImages(response.images);
            } else {
                console.error('Invalid response format:', response);
                setPexelsImages([]);
            }
        } catch (error) {
            console.error('Error fetching Pexels images:', error);
            setPexelsImages([]);
        }
        setLoadingImages(false);
    };
    
    const renderComponent = (component, sectionId) => {
        const { type, content, styles } = component;
        const isSelected = selectedComponentId === component.id;
        const componentStyles = { 
            ...styles, 
            border: isSelected ? '2px dashed #ec4899' : '2px dashed transparent', 
            transition: 'border 0.2s ease-in-out',
            cursor: 'pointer',
            position: 'relative'
        };

        const handleClick = (e) => {
            e.stopPropagation();
            setSelectedComponentId(component.id);
        };

        switch (type) {
            case 'hero': 
                return (
                    <div style={componentStyles} className="text-center" onClick={handleClick}>
                        <h1 style={{fontSize: styles.fontSize + 'px', fontFamily: styles.fontFamily, color: styles.color, margin: 0}}>
                            {content.title}
                        </h1>
                        <p style={{fontFamily: styles.fontFamily, color: styles.color, fontSize: '18px', margin: '10px 0 0 0'}}>
                            {content.subtitle}
                        </p>
                    </div>
                );
            case 'details': 
                return (
                    <div style={componentStyles} className="text-center" onClick={handleClick}>
                        <h3 style={{fontSize: styles.fontSize + 'px', fontFamily: styles.fontFamily, color: styles.color}}>
                            {content.title}
                        </h3>
                        <p style={{fontFamily: styles.fontFamily, color: styles.color}}>
                            {content.date} at {content.time}
                        </p>
                        <p style={{fontFamily: styles.fontFamily, color: styles.color}}>
                            {content.venue}
                        </p>
                    </div>
                );
            case 'text': 
                return (
                    <p style={{
                        ...componentStyles, 
                        fontSize: styles.fontSize + 'px', 
                        fontFamily: styles.fontFamily, 
                        color: styles.color, 
                        textAlign: styles.textAlign,
                        lineHeight: '1.6'
                    }} onClick={handleClick}>
                        {content.text}
                    </p>
                );
            case 'image': 
                return (
                    <img 
                        src={content.url} 
                        alt={content.alt} 
                        style={componentStyles} 
                        onClick={handleClick}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                        }}
                    />
                );
            default: 
                return <div style={componentStyles} onClick={handleClick}>Unknown Component</div>;
        }
    };
    
    const selectedComponent = design.sections[activeSection]?.components?.find(c => c.id === selectedComponentId);
    const currentSection = design.sections[activeSection];
    
    const StyleEditor = () => {
        if (!selectedComponent) return (
            <div className="text-center text-gray-500 py-8">
                Select an element on the canvas to style it.
            </div>
        );

        const handleStyleChange = (prop, value) => updateComponent(currentSection.id, selectedComponentId, { [prop]: value });
        const handleContentChange = (prop, value) => updateComponent(currentSection.id, selectedComponentId, {}, { [prop]: value });

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold capitalize">{selectedComponent.type} Editor</h3>
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => deleteComponent(currentSection.id, selectedComponent.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                
                {/* Content Editor */}
                {selectedComponent.type === 'text' && (
                    <div className="space-y-2">
                        <Label>Text Content</Label>
                        <Textarea 
                            placeholder="Enter your text" 
                            value={selectedComponent.content.text || ''} 
                            onChange={(e) => handleContentChange('text', e.target.value)} 
                        />
                    </div>
                )}
                
                {selectedComponent.type === 'hero' && (
                    <>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input 
                                placeholder="Main title" 
                                value={selectedComponent.content.title || ''} 
                                onChange={(e) => handleContentChange('title', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Input 
                                placeholder="Subtitle" 
                                value={selectedComponent.content.subtitle || ''} 
                                onChange={(e) => handleContentChange('subtitle', e.target.value)} 
                            />
                        </div>
                    </>
                )}
                
                {selectedComponent.type === 'image' && (
                    <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input 
                            placeholder="https://..." 
                            value={selectedComponent.content.url || ''} 
                            onChange={(e) => handleContentChange('url', e.target.value)} 
                        />
                    </div>
                )}

                {/* Style Editor */}
                {['hero', 'details', 'text'].includes(selectedComponent.type) && (
                    <>
                        <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Select 
                                value={selectedComponent.styles.fontFamily} 
                                onValueChange={(v) => handleStyleChange('fontFamily', v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Font" /></SelectTrigger>
                                <SelectContent>
                                    {GOOGLE_FONTS.map(f => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Font Size: {selectedComponent.styles.fontSize}px</Label>
                            <Slider 
                                value={[selectedComponent.styles.fontSize]} 
                                onValueChange={([v]) => handleStyleChange('fontSize', v)} 
                                min={8} 
                                max={120} 
                                step={1} 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Text Color</Label>
                            <Input 
                                type="color" 
                                value={selectedComponent.styles.color} 
                                onChange={(e) => handleStyleChange('color', e.target.value)} 
                                className="w-full h-10" 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Text Alignment</Label>
                            <div className="flex gap-2">
                                <Button 
                                    variant={selectedComponent.styles.textAlign === 'left' ? 'secondary' : 'outline'} 
                                    size="icon" 
                                    onClick={() => handleStyleChange('textAlign', 'left')}
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </Button>
                                <Button 
                                    variant={selectedComponent.styles.textAlign === 'center' ? 'secondary' : 'outline'} 
                                    size="icon" 
                                    onClick={() => handleStyleChange('textAlign', 'center')}
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </Button>
                                <Button 
                                    variant={selectedComponent.styles.textAlign === 'right' ? 'secondary' : 'outline'} 
                                    size="icon" 
                                    onClick={() => handleStyleChange('textAlign', 'right')}
                                >
                                    <AlignRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const SectionManager = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">Sections</h3>
                <Button size="sm" onClick={addSection}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Section
                </Button>
            </div>
            
            <div className="space-y-2">
                {design.sections.map((section, index) => (
                    <div 
                        key={section.id} 
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            activeSection === index ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveSection(index)}
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-medium">{section.name}</span>
                            <div className="flex items-center gap-1">
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSection(index);
                                    }}
                                >
                                    <Eye className="w-3 h-3" />
                                </Button>
                                {design.sections.length > 1 && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSection(index);
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {section.components.length} element{section.components.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const BackgroundEditor = () => {
        if (!currentSection) return null;

        const updateBackground = (updates) => {
            updateSectionBackground(activeSection, { ...currentSection.background, ...updates });
        };

        return (
            <div className="space-y-4">
                <h3 className="font-semibold">Section Background</h3>
                
                <div className="space-y-2">
                    <Label>Background Type</Label>
                    <Select 
                        value={currentSection.background.type} 
                        onValueChange={(type) => updateBackground({ type })}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="color">Solid Color</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {currentSection.background.type === 'color' && (
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <Input 
                            type="color" 
                            value={currentSection.background.value} 
                            onChange={(e) => updateBackground({ value: e.target.value })}
                            className="w-full h-10"
                        />
                    </div>
                )}

                {currentSection.background.type === 'gradient' && (
                    <div className="space-y-2">
                        <Label>Gradient Presets</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {GRADIENT_PRESETS.map((gradient, index) => (
                                <div 
                                    key={index}
                                    className="w-12 h-12 rounded-lg cursor-pointer border-2 hover:border-pink-300"
                                    style={{ background: gradient }}
                                    onClick={() => updateBackground({ value: gradient })}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {currentSection.background.type === 'image' && (
                    <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input 
                            placeholder="https://..." 
                            value={currentSection.background.value} 
                            onChange={(e) => updateBackground({ value: e.target.value })}
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderSection = (section, index) => {
        const sectionStyle = {
            minHeight: '100vh',
            padding: '20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        };

        // Apply background
        if (section.background.type === 'color') {
            sectionStyle.backgroundColor = section.background.value;
        } else if (section.background.type === 'gradient') {
            sectionStyle.background = section.background.value;
        } else if (section.background.type === 'image') {
            sectionStyle.backgroundImage = `url(${section.background.value})`;
            sectionStyle.backgroundSize = 'cover';
            sectionStyle.backgroundPosition = 'center';
        }

        // Apply overlay
        const hasOverlay = section.background.overlay && section.background.overlay !== 'rgba(0,0,0,0)';

        return (
            <div key={section.id} style={sectionStyle} className="relative">
                {hasOverlay && (
                    <div 
                        className="absolute inset-0" 
                        style={{ backgroundColor: section.background.overlay }}
                    />
                )}
                <div className="relative z-10 space-y-4">
                    {section.components.map((component) => (
                        <div key={component.id}>
                            {renderComponent(component, section.id)}
                        </div>
                    ))}
                </div>
                {index === activeSection && (
                    <div className="absolute top-4 left-4 bg-pink-500 text-white px-2 py-1 rounded text-xs font-medium">
                        {section.name}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
            {/* Left: Editor Panel */}
            <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Invitation Editor</h2>
                    <div className="flex gap-2">
                        <Button onClick={() => setPreviewMode(!previewMode)} size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleSave} size="sm" className="bg-pink-600 hover:bg-pink-700" disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
                
                <Tabs defaultValue="sections" className="flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 shrink-0">
                        <TabsTrigger value="sections"><Layers className="w-4 h-4 mr-1"/> Sections</TabsTrigger>
                        <TabsTrigger value="add"><Plus className="w-4 h-4 mr-1"/> Add</TabsTrigger>
                        <TabsTrigger value="style"><Palette className="w-4 h-4 mr-1"/> Style</TabsTrigger>
                        <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1"/> Settings</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="sections" className="p-4 overflow-y-auto">
                        <SectionManager />
                        <div className="mt-6">
                            <BackgroundEditor />
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="add" className="p-4 overflow-y-auto space-y-4">
                         <h3 className="font-semibold">Add Elements</h3>
                         <Button variant="outline" className="w-full justify-start" onClick={() => addComponent('hero')}>
                            <Type className="w-4 h-4 mr-2" /> Hero Section
                         </Button>
                         <Button variant="outline" className="w-full justify-start" onClick={() => addComponent('text')}>
                            <Type className="w-4 h-4 mr-2" /> Text Block
                         </Button>
                         <Button variant="outline" className="w-full justify-start" onClick={() => addComponent('image')}>
                            <ImageIcon className="w-4 h-4 mr-2" /> Image
                         </Button>
                         
                         {eventDetails && (
                            <div className="space-y-2 pt-4 border-t">
                                <h3 className="font-semibold">Event Details</h3>
                                <div className="space-y-1">
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => addComponent('text', { text: `${eventDetails.mainCeremony?.venueName || 'Ceremony Venue'}, ${eventDetails.mainCeremony?.address || 'Address'}` })}>
                                        <MapPin className="w-3 h-3 mr-2" />Ceremony Location
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => addComponent('text', { text: `Reception at ${eventDetails.reception?.startTime || 'Time'}` })}>
                                        <Clock className="w-3 h-3 mr-2" />Reception Time
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => addComponent('text', { text: invitationData.custom_message || 'Join us for our special day' })}>
                                        <Type className="w-3 h-3 mr-2" />Custom Message
                                    </Button>
                                </div>
                            </div>
                         )}

                         {guestSuiteSettings && (
                            <div className="space-y-2 pt-4 border-t">
                                <h3 className="font-semibold">Guest Suite Info</h3>
                                <div className="space-y-1">
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => addComponent('text', { text: guestSuiteSettings.welcome_message || 'Welcome to our wedding!' })}>
                                        <Users className="w-3 h-3 mr-2" />Welcome Message
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => addComponent('text', { text: `RSVP by ${invitationData.rsvp_deadline || 'TBD'}` })}>
                                        <Calendar className="w-3 h-3 mr-2" />RSVP Deadline
                                    </Button>
                                </div>
                            </div>
                         )}
                    </TabsContent>
                    
                    <TabsContent value="style" className="p-4 overflow-y-auto">
                        <StyleEditor />
                    </TabsContent>

                    <TabsContent value="settings" className="p-4 overflow-y-auto space-y-4">
                        <h3 className="font-semibold">Global Settings</h3>
                        
                        <div className="space-y-2">
                            <Label>Default Font Family</Label>
                            <Select 
                                value={design.globalStyles.fontFamily} 
                                onValueChange={(v) => setDesign(d => ({...d, globalStyles: {...d.globalStyles, fontFamily: v}}))}
                            >
                                <SelectTrigger><SelectValue placeholder="Font" /></SelectTrigger>
                                <SelectContent>
                                    {GOOGLE_FONTS.map(f => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Scroll Direction</Label>
                            <Select 
                                value={design.globalStyles.scrollDirection} 
                                onValueChange={(v) => setDesign(d => ({...d, globalStyles: {...d.globalStyles, scrollDirection: v}}))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vertical">Vertical</SelectItem>
                                    <SelectItem value="horizontal">Horizontal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Transition Effect</Label>
                            <Select 
                                value={design.globalStyles.transitionType} 
                                onValueChange={(v) => setDesign(d => ({...d, globalStyles: {...d.globalStyles, transitionType: v}}))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TRANSITION_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Center: Canvas */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
                <div 
                    ref={canvasRef}
                    className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden"
                    style={{ 
                        height: '600px',
                        fontFamily: design.globalStyles.fontFamily 
                    }}
                >
                    <div 
                        className={`h-full ${design.globalStyles.scrollDirection === 'horizontal' ? 'flex overflow-x-auto' : 'overflow-y-auto'}`}
                        onClick={() => setSelectedComponentId(null)}
                    >
                        {design.sections.map((section, index) => renderSection(section, index))}
                    </div>
                </div>
            </main>
            
            {/* Right: Media Library */}
            <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Media Library</h3>
                </div>
                <div className="p-4 space-y-4 flex-grow flex flex-col">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search images..."
                            value={imageSearchTerm}
                            onChange={(e) => setImageSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && searchPexelsImages(imageSearchTerm)}
                        />
                        <Button onClick={() => searchPexelsImages(imageSearchTerm)} disabled={loadingImages}>
                            {loadingImages ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
                        </Button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto">
                        {loadingImages ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                            </div>
                        ) : pexelsImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {pexelsImages.map(img => (
                                    <img 
                                        key={img.id} 
                                        src={img.url} 
                                        alt={img.alt} 
                                        className="rounded-md cursor-pointer hover:opacity-75 transition-opacity w-full h-20 object-cover" 
                                        onClick={() => addComponent('image', { url: img.url, alt: img.alt })}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 pt-10">
                                {imageSearchTerm ? 'No images found. Try another search.' : 'Search for images to add to your invitation.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedInvitationBuilder;