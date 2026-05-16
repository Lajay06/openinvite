import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlanSelectionPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                setLoading(false);
            } catch (error) {
                // Should be handled by login redirect, but as a fallback
                window.location.href = createPageUrl('Home');
            }
        };
        checkUser();
    }, []);

    const handleSelectPlan = async (plan) => {
        setLoading(true);
        try {
            await User.updateMyUserData({ plan });
            window.location.href = createPageUrl('Onboarding');
        } catch (error) {
            console.error("Error selecting plan:", error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 animate-spin text-sage-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-champagne-50 p-8">
            <div className="max-w-4xl mx-auto text-center">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-bold text-gray-800 mb-4"
                >
                    Choose Your Planning Style
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                    className="text-xl text-gray-600 mb-12"
                >
                    Start with the essentials or unlock our full suite of smart tools.
                </motion.p>

                <div className="grid md:grid-cols-2 gap-8">
                    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.4 } }}>
                        <Card className="text-left h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-2xl">Free</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <p className="text-4xl font-bold">$0</p>
                                <ul className="space-y-2 text-gray-600">
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Core Planning Tools</li>
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Guest List Management</li>
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Budget Tracking</li>
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button onClick={() => handleSelectPlan('free')} className="w-full h-12 text-lg" variant="outline">
                                    Continue with Free
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.6 } }}>
                        <Card className="text-left h-full flex flex-col border-2 border-sage-500 shadow-xl">
                             <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    Premium <Sparkles className="w-5 h-5 text-purple-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <p className="text-4xl font-bold">$199 <span className="text-lg font-normal text-gray-500">/ one-time</span></p>
                                <ul className="space-y-2 text-gray-600">
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Everything in Free, plus:</li>
                                    <li className="flex gap-2 font-semibold"><Sparkles className="w-5 h-5 text-purple-500" /> AI Wedding Assistant</li>
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Advanced Vendor Search</li>
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Smart Suggestions</li>
                                    <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Custom Guest Portal</li>
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button onClick={() => handleSelectPlan('premium')} className="w-full h-12 text-lg bg-sage-500 hover:bg-sage-600 text-white">
                                    Choose Premium
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}