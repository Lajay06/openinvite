import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, Edit, Save, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QnaSection({ qna, onQnaChange }) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedQuestion, setEditedQuestion] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');

  const handleAddQna = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const newQnaList = [...qna, { question: newQuestion, answer: newAnswer }];
    onQnaChange(newQnaList);
    setNewQuestion('');
    setNewAnswer('');
  };

  const handleDeleteQna = (index) => {
    const newQnaList = qna.filter((_, i) => i !== index);
    onQnaChange(newQnaList);
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditedQuestion(qna[index].question);
    setEditedAnswer(qna[index].answer);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedQuestion('');
    setEditedAnswer('');
  };

  const handleSaveEdit = (index) => {
    const newQnaList = [...qna];
    newQnaList[index] = { question: editedQuestion, answer: editedAnswer };
    onQnaChange(newQnaList);
    handleCancelEdit();
  };

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="w-full space-y-2">
        {qna.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="bg-gray-50 rounded-lg border px-4">
            {editingIndex === index ? (
              <div className="p-4 space-y-3">
                <Input
                  value={editedQuestion}
                  onChange={(e) => setEditedQuestion(e.target.value)}
                  placeholder="Question"
                />
                <Textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  placeholder="Answer"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  <Button size="sm" onClick={() => handleSaveEdit(index)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                </div>
              </div>
            ) : (
              <>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-medium text-left">{item.question}</span>
                    <div className="flex gap-2 items-center flex-shrink-0 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handleStartEdit(index)}}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => {e.stopPropagation(); handleDeleteQna(index)}}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600 whitespace-pre-wrap">{item.answer}</p>
                </AccordionContent>
              </>
            )}
          </AccordionItem>
        ))}
      </Accordion>
      
      {qna.length === 0 && (
          <p className="text-center text-gray-500 py-4">No questions added yet.</p>
      )}

      <Card className="bg-white border-gray-200">
        <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5"/>
                Add a New Question
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="new-question">Question</Label>
                <Input
                id="new-question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g., What is the dress code?"
                />
            </div>
            <div>
                <Label htmlFor="new-answer">Answer</Label>
                <Textarea
                id="new-answer"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="e.g., We'd love to see our family and friends get dressed up with us! The dress code is semi-formal."
                />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleAddQna} disabled={!newQuestion || !newAnswer}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Q&A
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}