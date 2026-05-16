import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  PieChart,
  X,
  Loader2,
  ArrowRight,
  Tag
} from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AIBudgetAssistant({ isOpen, onClose, budgetItems, stats }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [costSavings, setCostSavings] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');

  const analyzeSpendingPatterns = async () => {
    setLoading(true);
    try {
      const budgetData = {
        totalBudget: stats.totalBudgeted,
        totalSpent: stats.totalSpent,
        remaining: stats.remaining,
        percentageUsed: stats.percentageUsed,
        categories: budgetItems.reduce((acc, item) => {
          if (!acc[item.category]) {
            acc[item.category] = { budgeted: 0, spent: 0, items: [] };
          }
          acc[item.category].budgeted += item.budgeted_amount || 0;
          acc[item.category].spent += item.actual_amount || 0;
          acc[item.category].items.push({
            name: item.item_name,
            budgeted: item.budgeted_amount,
            spent: item.actual_amount,
            vendor: item.vendor
          });
          return acc;
        }, {})
      };

      const response = await InvokeLLM({
        prompt: `You are a wedding budget expert AI. Analyze this wedding budget data and provide detailed insights:

Budget Overview:
- Total Budget: $${budgetData.totalBudget.toLocaleString()}
- Total Spent: $${budgetData.totalSpent.toLocaleString()}
- Remaining: $${budgetData.remaining.toLocaleString()}
- Percentage Used: ${budgetData.percentageUsed.toFixed(1)}%

Category Breakdown:
${Object.entries(budgetData.categories).map(([cat, data]) => 
  `${cat}: Budgeted $${data.budgeted.toLocaleString()}, Spent $${data.spent.toLocaleString()}`
).join('\n')}

Provide a comprehensive analysis including:
1. Overall budget health (are they on track?)
2. Categories that are over/under budget with specific amounts
3. Top 3 spending concerns or red flags
4. Top 3 positive spending patterns
5. Specific actionable recommendations

Format your response in clear sections.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overallHealth: { type: 'string' },
            healthStatus: { type: 'string', enum: ['excellent', 'good', 'warning', 'critical'] },
            overBudgetCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  overAmount: { type: 'number' },
                  percentage: { type: 'number' }
                }
              }
            },
            underBudgetCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  underAmount: { type: 'number' },
                  percentage: { type: 'number' }
                }
              }
            },
            concerns: { type: 'array', items: { type: 'string' } },
            positives: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setAnalysis(response);
      toast.success('Budget analysis complete!');
    } catch (error) {
      console.error('Error analyzing budget:', error);
      toast.error('Failed to analyze budget');
    }
    setLoading(false);
  };

  const generateCostSavings = async () => {
    setLoading(true);
    try {
      const expensiveItems = budgetItems
        .filter(item => item.actual_amount > 0)
        .sort((a, b) => b.actual_amount - a.actual_amount)
        .slice(0, 10);

      const response = await InvokeLLM({
        prompt: `You are a wedding budget optimization expert. Here are the current wedding expenses:

${expensiveItems.map(item => 
  `- ${item.item_name} (${item.category}): $${item.actual_amount?.toLocaleString()} with ${item.vendor || 'no vendor'}`
).join('\n')}

For each major expense, suggest:
1. Cost-saving alternatives that maintain quality
2. DIY options if applicable
3. Timing strategies (booking off-season, weekday discounts)
4. Negotiation tips with vendors
5. Estimated potential savings

Be specific and practical with your suggestions.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  item: { type: 'string' },
                  currentCost: { type: 'number' },
                  alternatives: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        option: { type: 'string' },
                        description: { type: 'string' },
                        estimatedSavings: { type: 'number' },
                        tradeoffs: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            totalPotentialSavings: { type: 'number' }
          }
        }
      });

      setCostSavings(response);
      toast.success('Cost-saving suggestions generated!');
    } catch (error) {
      console.error('Error generating cost savings:', error);
      toast.error('Failed to generate suggestions');
    }
    setLoading(false);
  };

  const predictFutureCosts = async () => {
    setLoading(true);
    try {
      const categoriesWithItems = budgetItems.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push({
          name: item.item_name,
          budgeted: item.budgeted_amount,
          spent: item.actual_amount,
          paid: item.paid
        });
        return acc;
      }, {});

      const response = await InvokeLLM({
        prompt: `You are a wedding budget forecasting expert. Based on this current spending data, predict future costs:

Current Status:
- Total Budget: $${stats.totalBudgeted.toLocaleString()}
- Total Spent So Far: $${stats.totalSpent.toLocaleString()}
- Budget Used: ${stats.percentageUsed.toFixed(1)}%

Categories and Items:
${Object.entries(categoriesWithItems).map(([cat, items]) => 
  `${cat}:\n${items.map(i => `  - ${i.name}: Budgeted $${i.budgeted?.toLocaleString() || 0}, Spent $${i.spent?.toLocaleString() || 0}`).join('\n')}`
).join('\n\n')}

Provide predictions for:
1. Likely hidden or forgotten costs by category
2. Expected cost overruns based on current trends
3. Last-minute expenses typically forgotten
4. Contingency buffer recommendation
5. Final total cost prediction

Be specific with dollar amounts and reasoning.`,
        response_json_schema: {
          type: 'object',
          properties: {
            hiddenCosts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  item: { type: 'string' },
                  estimatedCost: { type: 'number' },
                  reason: { type: 'string' }
                }
              }
            },
            likelyOverruns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  currentSpend: { type: 'number' },
                  predictedFinal: { type: 'number' },
                  reason: { type: 'string' }
                }
              }
            },
            lastMinuteExpenses: { type: 'array', items: { type: 'string' } },
            recommendedContingency: { type: 'number' },
            predictedFinalTotal: { type: 'number' },
            confidenceLevel: { type: 'string' }
          }
        }
      });

      setPredictions(response);
      toast.success('Cost predictions generated!');
    } catch (error) {
      console.error('Error predicting costs:', error);
      toast.error('Failed to predict costs');
    }
    setLoading(false);
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold">AI Budget Assistant</span>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-600">
            Get AI-powered insights, cost-saving suggestions, and budget predictions
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">
              <PieChart className="w-4 h-4 mr-2" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="savings">
              <Lightbulb className="w-4 h-4 mr-2" />
              Cost Savings
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <TrendingUp className="w-4 h-4 mr-2" />
              Predictions
            </TabsTrigger>
          </TabsList>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6 mt-6">
            {!analysis ? (
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Brain className="w-16 h-16 text-purple-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Analyze Your Budget
                  </h3>
                  <p className="text-gray-600 text-center mb-6 max-w-md">
                    Get detailed insights on your spending patterns, identify areas of concern, and receive actionable recommendations.
                  </p>
                  <Button
                    onClick={analyzeSpendingPatterns}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Overall Health */}
                <Card className={`border-2 ${getHealthColor(analysis.healthStatus)}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {analysis.healthStatus === 'excellent' || analysis.healthStatus === 'good' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      Budget Health Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg">{analysis.overallHealth}</p>
                  </CardContent>
                </Card>

                {/* Over Budget Categories */}
                {analysis.overBudgetCategories?.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <TrendingUp className="w-5 h-5" />
                        Over Budget Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.overBudgetCategories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <span className="font-semibold capitalize">{cat.category}</span>
                              <p className="text-sm text-red-600">
                                ${cat.overAmount?.toLocaleString()} over budget ({cat.percentage?.toFixed(1)}%)
                              </p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-red-500" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Under Budget Categories */}
                {analysis.underBudgetCategories?.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <TrendingDown className="w-5 h-5" />
                        Under Budget Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.underBudgetCategories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <span className="font-semibold capitalize">{cat.category}</span>
                              <p className="text-sm text-green-600">
                                ${cat.underAmount?.toLocaleString()} under budget ({cat.percentage?.toFixed(1)}%)
                              </p>
                            </div>
                            <TrendingDown className="w-5 h-5 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Concerns & Positives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="w-5 h-5" />
                        Concerns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.concerns?.map((concern, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        Positives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.positives?.map((positive, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{positive}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Lightbulb className="w-5 h-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.recommendations?.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={analyzeSpendingPatterns}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Refresh Analysis
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Cost Savings Tab */}
          <TabsContent value="savings" className="space-y-6 mt-6">
            {!costSavings ? (
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Lightbulb className="w-16 h-16 text-yellow-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Find Cost Savings
                  </h3>
                  <p className="text-gray-600 text-center mb-6 max-w-md">
                    Discover practical alternatives and money-saving strategies for your wedding expenses.
                  </p>
                  <Button
                    onClick={generateCostSavings}
                    disabled={loading}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Get Suggestions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Total Potential Savings */}
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="py-6">
                    <div className="text-center">
                      <p className="text-sm text-green-700 font-medium mb-1">Total Potential Savings</p>
                      <p className="text-4xl font-bold text-green-600">
                        ${costSavings.totalPotentialSavings?.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions by Category */}
                <div className="space-y-4">
                  {costSavings.suggestions?.map((suggestion, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-pink-500" />
                            <span className="capitalize">{suggestion.category}</span>
                          </CardTitle>
                          <Badge variant="outline" className="text-sm">
                            Current: ${suggestion.currentCost?.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{suggestion.item}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {suggestion.alternatives?.map((alt, altIdx) => (
                            <div key={altIdx} className="p-4 bg-gray-50 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{alt.option}</h4>
                                <Badge className="bg-green-500">
                                  Save ${alt.estimatedSavings?.toLocaleString()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">{alt.description}</p>
                              {alt.tradeoffs && (
                                <p className="text-xs text-gray-500 italic">
                                  <strong>Note:</strong> {alt.tradeoffs}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={generateCostSavings}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Refresh Suggestions
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6 mt-6">
            {!predictions ? (
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Predict Future Costs
                  </h3>
                  <p className="text-gray-600 text-center mb-6 max-w-md">
                    Get AI predictions for hidden costs, potential overruns, and your final budget.
                  </p>
                  <Button
                    onClick={predictFutureCosts}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Predicting...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Generate Predictions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Final Prediction */}
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="py-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-blue-700 font-medium">Predicted Final Total</p>
                      <p className="text-4xl font-bold text-blue-600">
                        ${predictions.predictedFinalTotal?.toLocaleString()}
                      </p>
                      <p className="text-sm text-blue-600">
                        Confidence: {predictions.confidenceLevel}
                      </p>
                      <div className="mt-4 p-3 bg-white rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Recommended Contingency Buffer</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${predictions.recommendedContingency?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hidden Costs */}
                {predictions.hiddenCosts?.length > 0 && (
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="w-5 h-5" />
                        Likely Hidden Costs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {predictions.hiddenCosts.map((cost, idx) => (
                          <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold capitalize">{cost.category}: {cost.item}</span>
                              <Badge className="bg-yellow-500">
                                ~${cost.estimatedCost?.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{cost.reason}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Likely Overruns */}
                {predictions.likelyOverruns?.length > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-700">
                        <TrendingUp className="w-5 h-5" />
                        Expected Cost Overruns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {predictions.likelyOverruns.map((overrun, idx) => (
                          <div key={idx} className="p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold capitalize">{overrun.category}</span>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  Current: ${overrun.currentSpend?.toLocaleString()}
                                </p>
                                <p className="text-sm font-semibold text-orange-600">
                                  Predicted: ${overrun.predictedFinal?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700">{overrun.reason}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Last Minute Expenses */}
                {predictions.lastMinuteExpenses?.length > 0 && (
                  <Card className="border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <DollarSign className="w-5 h-5" />
                        Don't Forget These Last-Minute Expenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {predictions.lastMinuteExpenses.map((expense, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-purple-50 rounded">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span>{expense}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={predictFutureCosts}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Refresh Predictions
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}