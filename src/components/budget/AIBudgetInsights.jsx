import React, { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AIBudgetInsights({ budgetItems, stats }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [costSavings, setCostSavings] = useState(null);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    if (budgetItems.length > 0) {
      analyzeSpendingPatterns();
    }
  }, [budgetItems.length]);

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
    } catch (error) {
      console.error('Error analyzing budget:', error);
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
    }
    setLoading(false);
  };

  const generatePredictions = async () => {
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
    }
    setLoading(false);
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-700 bg-green-50';
      case 'good': return 'text-blue-700 bg-blue-50';
      case 'warning': return 'text-yellow-700 bg-yellow-50';
      case 'critical': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  if (budgetItems.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200">
      <Accordion type="multiple" className="w-full">
        {/* Budget Analysis */}
        <AccordionItem value="analysis" className="border-b border-gray-200">
          <AccordionTrigger className="text-base font-semibold text-gray-900 hover:no-underline py-5 px-0">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Budget Analysis
              {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-4 px-0">
            {analysis ? (
              <>
                {/* Overall Health */}
                <div className={`p-4 rounded-lg ${getHealthColor(analysis.healthStatus)}`}>
                  <div className="flex items-start gap-2">
                    {analysis.healthStatus === 'excellent' || analysis.healthStatus === 'good' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{analysis.overallHealth}</p>
                  </div>
                </div>

                {/* Over Budget Categories */}
                {analysis.overBudgetCategories?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Over Budget Categories
                    </h4>
                    {analysis.overBudgetCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded text-sm">
                        <span className="font-medium capitalize">{cat.category}</span>
                        <span className="text-red-600">
                          +${cat.overAmount?.toLocaleString()} ({cat.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Under Budget Categories */}
                {analysis.underBudgetCategories?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Under Budget Categories
                    </h4>
                    {analysis.underBudgetCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded text-sm">
                        <span className="font-medium capitalize">{cat.category}</span>
                        <span className="text-green-600">
                          -${cat.underAmount?.toLocaleString()} ({cat.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Concerns & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.concerns?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Concerns
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {analysis.concerns.map((concern, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.positives?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Positives
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {analysis.positives.map((positive, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{positive}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {analysis.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <div className="space-y-2">
                      {analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded text-sm">
                          <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={analyzeSpendingPatterns}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Refresh Analysis
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Analyzing your budget...</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Cost Savings */}
        <AccordionItem value="savings" className="border-b border-gray-200">
          <AccordionTrigger className="text-base font-semibold text-gray-900 hover:no-underline py-5 px-0">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Cost Savings
              {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-4 px-0">
            {!costSavings ? (
              <div className="text-center py-8">
                <Button
                  onClick={generateCostSavings}
                  disabled={loading}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Cost Savings
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                {/* Total Savings */}
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">Total Potential Savings</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${costSavings.totalPotentialSavings?.toLocaleString()}
                  </p>
                </div>

                {/* Suggestions */}
                <div className="space-y-4">
                  {costSavings.suggestions?.map((suggestion, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold capitalize">{suggestion.category}</span>
                        <Badge variant="outline" className="text-xs">
                          ${suggestion.currentCost?.toLocaleString()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{suggestion.item}</p>
                      <div className="space-y-2">
                        {suggestion.alternatives?.map((alt, altIdx) => (
                          <div key={altIdx} className="p-3 bg-gray-50 rounded text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{alt.option}</span>
                              <Badge className="bg-green-500 text-xs">
                                Save ${alt.estimatedSavings?.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">{alt.description}</p>
                            {alt.tradeoffs && (
                              <p className="text-xs text-gray-500 italic mt-1">
                                Note: {alt.tradeoffs}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Predictions */}
        <AccordionItem value="predictions" className="border-b border-gray-200">
          <AccordionTrigger className="text-base font-semibold text-gray-900 hover:no-underline py-5 px-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Cost Predictions
              {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-4 px-0">
            {!predictions ? (
              <div className="text-center py-8">
                <Button
                  onClick={generatePredictions}
                  disabled={loading}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Predictions
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                {/* Final Prediction */}
                <div className="p-4 bg-blue-50 rounded-lg text-center space-y-2">
                  <p className="text-sm text-blue-700 font-medium">Predicted Final Total</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${predictions.predictedFinalTotal?.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">
                    Confidence: {predictions.confidenceLevel}
                  </p>
                  <div className="mt-2 p-2 bg-white rounded">
                    <p className="text-xs font-medium text-gray-700">Recommended Contingency</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${predictions.recommendedContingency?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Hidden Costs */}
                {predictions.hiddenCosts?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Likely Hidden Costs
                    </h4>
                    {predictions.hiddenCosts.map((cost, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{cost.category}: {cost.item}</span>
                          <Badge className="bg-yellow-500 text-xs">
                            ~${cost.estimatedCost?.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{cost.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overruns */}
                {predictions.likelyOverruns?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Expected Overruns
                    </h4>
                    {predictions.likelyOverruns.map((overrun, idx) => (
                      <div key={idx} className="p-3 bg-orange-50 rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{overrun.category}</span>
                          <div className="text-right text-xs">
                            <p className="text-gray-600">${overrun.currentSpend?.toLocaleString()}</p>
                            <p className="text-orange-600 font-semibold">→ ${overrun.predictedFinal?.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{overrun.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Last Minute */}
                {predictions.lastMinuteExpenses?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Last-Minute Expenses to Remember
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {predictions.lastMinuteExpenses.map((expense, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 bg-purple-50 rounded text-xs">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{expense}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}