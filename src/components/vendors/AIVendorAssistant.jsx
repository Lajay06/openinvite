import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Sparkles, Star, Search, DollarSign, AlertCircle, CheckCircle,
  X, Tag, TrendingUp, Bell, Award, FileText, Calendar
} from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block', marginBottom: 6,
};

const sectionBox = {
  border: '1px solid rgba(10,10,10,0.08)', padding: 20, marginBottom: 16,
};

const infoRow = {
  display: 'flex', gap: 16, padding: '10px 0',
  borderBottom: '1px solid rgba(10,10,10,0.06)',
};

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#FFFFFF', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', flexShrink: 0,
      }} />
    </>
  );
}

export default function AIVendorAssistant({ isOpen, onClose, vendors, onVendorUpdate }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('categorize');

  const [contractText, setContractText] = useState('');
  const [categorizedVendor, setCategorizedVendor] = useState(null);

  const [selectedVendorForAnalysis, setSelectedVendorForAnalysis] = useState('');
  const [performanceResults, setPerformanceResults] = useState(null);

  const [suggestionParams, setSuggestionParams] = useState({ category: '', budget: '', style: '', location: '' });
  const [vendorSuggestions, setVendorSuggestions] = useState(null);

  const [paymentReminders, setPaymentReminders] = useState(null);

  if (!isOpen) return null;

  const categorizeVendor = async () => {
    if (!contractText.trim()) { toast.error('Please enter vendor information'); return; }
    setLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `You are a wedding vendor classification expert. Analyze this vendor information/contract and extract key details:\n\n${contractText}\n\nExtract: business name, category (venue/catering/photography/videography/flowers/music/bakery/transportation/beauty/attire/planning/decorations/entertainment/other), contact person, phone, email, service details, total cost, payment schedule, key contract terms, special requirements, confidence.`,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' }, category: { type: 'string' },
            contact_person: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
            service_details: { type: 'string' }, quoted_price: { type: 'number' },
            payment_schedule: { type: 'string' },
            contract_terms: { type: 'array', items: { type: 'string' } },
            special_requirements: { type: 'string' }, confidence: { type: 'string' },
          },
        },
      });
      setCategorizedVendor(response);
      toast.success('Vendor information extracted');
    } catch { toast.error('Failed to categorize vendor information'); }
    setLoading(false);
  };

  const analyzeVendorPerformance = async () => {
    if (!selectedVendorForAnalysis) { toast.error('Please select a vendor'); return; }
    const vendor = vendors.find(v => v.id === selectedVendorForAnalysis);
    if (!vendor) return;
    setLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `Analyze this wedding vendor's performance:\nName: ${vendor.name}\nCategory: ${vendor.category}\nStatus: ${vendor.status}\nRating: ${vendor.rating || 'N/A'}\nGoogle Rating: ${vendor.google_rating || 'N/A'} (${vendor.google_reviews_count || 0} reviews)\nQuoted Price: $${vendor.quoted_price?.toLocaleString() || 'N/A'}\nNotes: ${vendor.notes || 'None'}\n\nProvide: performanceScore (1-10), overallAssessment, strengths[], concerns[], valueForMoney, reliabilityScore (1-10), recommendation, industryComparison, questionsToAsk[].`,
        response_json_schema: {
          type: 'object',
          properties: {
            performanceScore: { type: 'number' }, overallAssessment: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            concerns: { type: 'array', items: { type: 'string' } },
            valueForMoney: { type: 'string' }, reliabilityScore: { type: 'number' },
            recommendation: { type: 'string' }, industryComparison: { type: 'string' },
            questionsToAsk: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setPerformanceResults({ vendor, analysis: response });
      toast.success('Analysis complete');
    } catch { toast.error('Failed to analyze vendor'); }
    setLoading(false);
  };

  const suggestAlternativeVendors = async () => {
    if (!suggestionParams.category) { toast.error('Please select a category'); return; }
    setLoading(true);
    try {
      const current = vendors.filter(v => v.category === suggestionParams.category);
      const response = await InvokeLLM({
        prompt: `Suggest alternative wedding vendors:\nCategory: ${suggestionParams.category}\nBudget: ${suggestionParams.budget || 'Flexible'}\nStyle: ${suggestionParams.style || 'Any'}\nLocation: ${suggestionParams.location || 'Any'}\nCurrent vendors: ${current.map(v => v.name).join(', ') || 'None'}\n\nProvide 5 recommendations with vendorName, whyGoodFit, estimatedPriceRange, uniqueSellingPoints[], bookingTips, availabilityNotes, researchChecklist[]. Also generalAdvice and budgetTips.`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vendorName: { type: 'string' }, whyGoodFit: { type: 'string' },
                  estimatedPriceRange: { type: 'string' },
                  uniqueSellingPoints: { type: 'array', items: { type: 'string' } },
                  bookingTips: { type: 'string' }, availabilityNotes: { type: 'string' },
                  researchChecklist: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            generalAdvice: { type: 'string' }, budgetTips: { type: 'string' },
          },
        },
      });
      setVendorSuggestions(response);
      toast.success('Suggestions generated');
    } catch { toast.error('Failed to generate suggestions'); }
    setLoading(false);
  };

  const generatePaymentReminders = async () => {
    const booked = vendors.filter(v => v.status === 'booked');
    if (booked.length === 0) { toast.error('No booked vendors found'); return; }
    setLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `Generate payment schedules for these booked vendors:\n${booked.map(v => `- ${v.name} (${v.category}): $${v.quoted_price?.toLocaleString() || 'N/A'}, Schedule: ${v.payment_schedule || 'N/A'}, Contract: ${v.contract_date || 'N/A'}`).join('\n')}\n\nFor each: vendorName, category, totalAmount, paymentMilestones[] (milestone, percentage, amount, suggestedDate, whatToConfirm[]), importantNotes[]. Plus generalPaymentTips[].`,
        response_json_schema: {
          type: 'object',
          properties: {
            reminders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vendorName: { type: 'string' }, category: { type: 'string' },
                  totalAmount: { type: 'number' },
                  paymentMilestones: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        milestone: { type: 'string' }, percentage: { type: 'number' },
                        amount: { type: 'number' }, suggestedDate: { type: 'string' },
                        whatToConfirm: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                  importantNotes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            generalPaymentTips: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setPaymentReminders(response);
      toast.success('Payment schedule generated');
    } catch { toast.error('Failed to generate payment schedule'); }
    setLoading(false);
  };

  const handleSaveCategorized = () => {
    if (categorizedVendor && onVendorUpdate) {
      onVendorUpdate({
        name: categorizedVendor.name, category: categorizedVendor.category,
        contact_person: categorizedVendor.contact_person, phone: categorizedVendor.phone,
        email: categorizedVendor.email, quoted_price: categorizedVendor.quoted_price,
        payment_schedule: categorizedVendor.payment_schedule,
        notes: [categorizedVendor.service_details, categorizedVendor.contract_terms?.join('\n'), categorizedVendor.special_requirements].filter(Boolean).join('\n\n'),
      });
      toast.success('Vendor ready to save');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', position: 'relative' }}>

        {/* Header */}
        <div style={{ background: '#0A1930', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Ask Ava — manage my vendors
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start" style={{ marginBottom: 24 }}>
              <TabsTrigger value="categorize"><Tag size={12} style={{ marginRight: 6 }} />Categorize</TabsTrigger>
              <TabsTrigger value="analyze"><Award size={12} style={{ marginRight: 6 }} />Analyze</TabsTrigger>
              <TabsTrigger value="suggest"><Search size={12} style={{ marginRight: 6 }} />Suggest</TabsTrigger>
              <TabsTrigger value="payments"><Bell size={12} style={{ marginRight: 6 }} />Payments</TabsTrigger>
            </TabsList>

            {/* ── Categorize Tab ── */}
            <TabsContent value="categorize">
              <div style={sectionBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileText size={14} style={{ color: '#803D81' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Paste contract or vendor details</span>
                </div>
                <Textarea
                  placeholder="Paste vendor contract, email, or any vendor information here — Ava will extract and categorize all relevant details including name, category, pricing, contact info, and contract terms."
                  value={contractText}
                  onChange={e => setContractText(e.target.value)}
                  style={{ minHeight: 180, marginBottom: 16 }}
                />
                <button
                  onClick={categorizeVendor}
                  disabled={loading || !contractText.trim()}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: loading || !contractText.trim() ? 0.5 : 1 }}
                >
                  {loading ? <Spinner /> : <Sparkles size={13} />}
                  {loading ? 'Analysing…' : 'Categorize & extract details'}
                </button>
              </div>

              {categorizedVendor && (
                <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderLeft: '3px solid #DDF762' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(221,247,98,0.08)' }}>
                    <CheckCircle size={14} style={{ color: '#6b7700' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Extracted information</span>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                      {[
                        ['Business name', categorizedVendor.name],
                        ['Category', categorizedVendor.category],
                        ['Contact person', categorizedVendor.contact_person],
                        ['Phone', categorizedVendor.phone],
                        ['Email', categorizedVendor.email],
                        ['Quoted price', categorizedVendor.quoted_price ? `$${Number(categorizedVendor.quoted_price).toLocaleString()}` : null],
                      ].map(([label, val]) => val ? (
                        <div key={label} style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)' }}>
                          <p style={{ ...labelStyle, marginBottom: 4 }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{val}</p>
                        </div>
                      ) : null)}
                    </div>
                    {categorizedVendor.service_details && (
                      <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)', marginBottom: 12 }}>
                        <p style={{ ...labelStyle, marginBottom: 4 }}>Service details</p>
                        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{categorizedVendor.service_details}</p>
                      </div>
                    )}
                    {categorizedVendor.payment_schedule && (
                      <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)', marginBottom: 12 }}>
                        <p style={{ ...labelStyle, marginBottom: 4 }}>Payment schedule</p>
                        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{categorizedVendor.payment_schedule}</p>
                      </div>
                    )}
                    {categorizedVendor.contract_terms?.length > 0 && (
                      <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)', marginBottom: 16 }}>
                        <p style={{ ...labelStyle, marginBottom: 8 }}>Key contract terms</p>
                        {categorizedVendor.contract_terms.map((term, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, paddingTop: i > 0 ? 6 : 0, marginTop: i > 0 ? 6 : 0, borderTop: i > 0 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                            <span style={{ color: '#6b7700', fontWeight: 700, fontSize: 12 }}>—</span>
                            <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{term}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleSaveCategorized} className="btn-primary" style={{ fontSize: 12 }}>Save to vendors</button>
                      <button onClick={() => setCategorizedVendor(null)} className="btn-editorial-secondary" style={{ fontSize: 12 }}>Clear</button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Analyze Tab ── */}
            <TabsContent value="analyze">
              <div style={sectionBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Award size={14} style={{ color: '#803D81' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Select vendor to analyse</span>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Select value={selectedVendorForAnalysis} onValueChange={setSelectedVendorForAnalysis}>
                    <SelectTrigger><SelectValue placeholder="Choose a vendor…" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.category})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={analyzeVendorPerformance}
                  disabled={loading || !selectedVendorForAnalysis}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: loading || !selectedVendorForAnalysis ? 0.5 : 1 }}
                >
                  {loading ? <Spinner /> : <TrendingUp size={13} />}
                  {loading ? 'Analysing…' : 'Analyse performance'}
                </button>
              </div>

              {performanceResults && (
                <div>
                  {/* Score strip */}
                  <div style={{ background: '#0A1930', padding: '24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{performanceResults.vendor.name}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0' }}>{performanceResults.analysis.recommendation}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 36, fontWeight: 700, color: '#DDF762', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1 }}>
                        {performanceResults.analysis.performanceScore}<span style={{ fontSize: 16, color: 'rgba(221,247,98,0.5)' }}>/10</span>
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Performance</p>
                    </div>
                  </div>

                  {/* Assessment */}
                  <div style={{ ...sectionBox, marginBottom: 12 }}>
                    <p style={labelStyle}>Overall assessment</p>
                    <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.6 }}>{performanceResults.analysis.overallAssessment}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {/* Strengths */}
                    <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderLeft: '3px solid #DDF762', padding: 16 }}>
                      <p style={{ ...labelStyle, color: '#6b7700' }}>Strengths</p>
                      {performanceResults.analysis.strengths?.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < performanceResults.analysis.strengths.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                          <CheckCircle size={11} style={{ color: '#6b7700', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                    {/* Concerns */}
                    <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderLeft: '3px solid #E03553', padding: 16 }}>
                      <p style={{ ...labelStyle, color: '#E03553' }}>Concerns</p>
                      {performanceResults.analysis.concerns?.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < performanceResults.analysis.concerns.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                          <AlertCircle size={11} style={{ color: '#E03553', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...sectionBox, marginBottom: 12 }}>
                    <p style={labelStyle}>Value for money</p>
                    <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 12px' }}>{performanceResults.analysis.valueForMoney}</p>
                    <p style={labelStyle}>Industry comparison</p>
                    <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{performanceResults.analysis.industryComparison}</p>
                  </div>

                  {performanceResults.analysis.questionsToAsk?.length > 0 && (
                    <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderLeft: '3px solid #803D81', padding: 16 }}>
                      <p style={{ ...labelStyle, color: '#803D81' }}>Questions to ask</p>
                      {performanceResults.analysis.questionsToAsk.map((q, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < performanceResults.analysis.questionsToAsk.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#803D81', flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{i + 1}.</span>
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── Suggest Tab ── */}
            <TabsContent value="suggest">
              <div style={sectionBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Search size={14} style={{ color: '#803D81' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find alternative vendors</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <Select value={suggestionParams.category} onValueChange={v => setSuggestionParams(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                      <SelectContent>
                        {['venue','catering','photography','videography','flowers','music','bakery','beauty','attire','planning','decorations','entertainment','transportation','other'].map(c => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label style={labelStyle}>Budget</label>
                    <Select value={suggestionParams.budget} onValueChange={v => setSuggestionParams(p => ({ ...p, budget: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select budget…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-3000">$1,000 – $3,000</SelectItem>
                        <SelectItem value="3000-5000">$3,000 – $5,000</SelectItem>
                        <SelectItem value="5000-10000">$5,000 – $10,000</SelectItem>
                        <SelectItem value="over-10000">Over $10,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label style={labelStyle}>Style / theme</label>
                    <Input value={suggestionParams.style} onChange={e => setSuggestionParams(p => ({ ...p, style: e.target.value }))} placeholder="e.g. Rustic, Modern, Vintage…" />
                  </div>
                  <div>
                    <label style={labelStyle}>Location</label>
                    <Input value={suggestionParams.location} onChange={e => setSuggestionParams(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Los Angeles, CA" />
                  </div>
                </div>
                <button
                  onClick={suggestAlternativeVendors}
                  disabled={loading || !suggestionParams.category}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: loading || !suggestionParams.category ? 0.5 : 1 }}
                >
                  {loading ? <Spinner /> : <Search size={13} />}
                  {loading ? 'Finding vendors…' : 'Get suggestions'}
                </button>
              </div>

              {vendorSuggestions && (
                <div>
                  {vendorSuggestions.generalAdvice && (
                    <div style={{ borderLeft: '3px solid #803D81', padding: '12px 16px', background: 'rgba(128,61,129,0.05)', marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{vendorSuggestions.generalAdvice}</p>
                    </div>
                  )}
                  {vendorSuggestions.recommendations?.map((rec, i) => (
                    <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 12 }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: '#0A1930', color: '#DDF762', fontSize: 10, fontWeight: 700, borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{i + 1}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{rec.vendorName}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{rec.estimatedPriceRange}</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 12 }}>{rec.whyGoodFit}</p>
                        {rec.uniqueSellingPoints?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <p style={labelStyle}>Selling points</p>
                            {rec.uniqueSellingPoints.map((pt, j) => (
                              <div key={j} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                                <Star size={10} style={{ color: '#6b7700', fill: '#DDF762', flexShrink: 0, marginTop: 3 }} />
                                <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {rec.bookingTips && (
                            <div style={{ padding: 10, background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)' }}>
                              <p style={labelStyle}>Booking tips</p>
                              <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{rec.bookingTips}</p>
                            </div>
                          )}
                          {rec.availabilityNotes && (
                            <div style={{ padding: 10, background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.06)' }}>
                              <p style={labelStyle}>Availability</p>
                              <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{rec.availabilityNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Payments Tab ── */}
            <TabsContent value="payments">
              <div style={{ ...sectionBox, textAlign: 'center', padding: '40px 20px' }}>
                <Bell size={28} style={{ color: '#E03553', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 8px' }}>Payment schedule generator</p>
                <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 20px' }}>
                  Generate smart payment reminders for all your booked vendors.
                </p>
                <button
                  onClick={generatePaymentReminders}
                  disabled={loading}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? <Spinner /> : <Calendar size={13} />}
                  {loading ? 'Generating…' : 'Generate payment schedule'}
                </button>
              </div>

              {paymentReminders && (
                <div>
                  {paymentReminders.generalPaymentTips?.length > 0 && (
                    <div style={{ borderLeft: '3px solid #E03553', padding: '12px 16px', background: 'rgba(224,53,83,0.04)', marginBottom: 16 }}>
                      <p style={{ ...labelStyle, color: '#E03553', marginBottom: 8 }}>General payment tips</p>
                      {paymentReminders.generalPaymentTips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: i < paymentReminders.generalPaymentTips.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
                          <span style={{ color: '#E03553', fontWeight: 700, fontSize: 11 }}>—</span>
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {paymentReminders.reminders?.map((reminder, i) => (
                    <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 16 }}>
                      <div style={{ background: '#0A1930', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{reminder.vendorName}</span>
                        {reminder.totalAmount > 0 && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#DDF762', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            ${Number(reminder.totalAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        {reminder.paymentMilestones?.map((m, j) => (
                          <div key={j} style={{ borderLeft: '3px solid #803D81', padding: '12px 14px', marginBottom: 10, background: '#FAFAFA' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{m.milestone}</p>
                                <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{m.suggestedDate}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                                  {m.amount > 0 ? `$${Number(m.amount).toLocaleString()}` : ''}
                                </p>
                                {m.percentage > 0 && (
                                  <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{m.percentage}%</p>
                                )}
                              </div>
                            </div>
                            {m.whatToConfirm?.length > 0 && (
                              <div style={{ borderTop: '1px solid rgba(10,10,10,0.06)', paddingTop: 8, marginTop: 4 }}>
                                <p style={{ ...labelStyle, marginBottom: 6 }}>Confirm before payment</p>
                                {m.whatToConfirm.map((item, k) => (
                                  <div key={k} style={{ display: 'flex', gap: 6, padding: '3px 0' }}>
                                    <CheckCircle size={10} style={{ color: '#6b7700', flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {reminder.importantNotes?.length > 0 && (
                          <div style={{ borderLeft: '3px solid #E03553', padding: '10px 14px', background: 'rgba(224,53,83,0.04)' }}>
                            <p style={{ ...labelStyle, color: '#E03553', marginBottom: 6 }}>Important notes</p>
                            {reminder.importantNotes.map((note, k) => (
                              <div key={k} style={{ display: 'flex', gap: 6, padding: '3px 0' }}>
                                <AlertCircle size={10} style={{ color: '#E03553', flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{note}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
