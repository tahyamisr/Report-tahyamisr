"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import React, { useTransition, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitPlan } from "./actions";
import { Loader2, Trash2, Pencil, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    Telegram: any;
  }
}

const arabicQuadName = z.string()
  .min(1, "الاسم مطلوب.")
  .refine(value => /^[\u0621-\u064A\s]+$/.test(value), {
    message: "الرجاء إدخال الاسم باللغة العربية فقط.",
  })
  .refine(value => value.trim().split(/\s+/).length >= 4, {
    message: "الرجاء إدخال الاسم رباعي على الأقل.",
  });

const formSchema = z.object({
  governorate: z.string().min(1, "الرجاء اختيار المحافظة."),
  month: z.string().min(1, "الرجاء اختيار الشهر."),
  events: z
    .array(
      z.object({
        details: z.string().min(1, "تفاصيل الحدث مطلوبة."),
        date: z.string().min(1, "التاريخ مطلوب."),
        type: z.string().min(1, "نوع الحدث مطلوب."),
        result: z.string().min(1, "نتيجة الحدث مطلوبة."),
      })
    )
    .min(1, "يجب إضافة فعالية واحدة على الأقل."),
  deputies: z.array(z.object({ name: arabicQuadName })).min(1, "يجب إضافة نائب واحد على الأقل."),
  president: arabicQuadName,
});

const months = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const governorates = [
    "الجيزة", "القاهرة", "الدقهلية", "السويس", "البحيرة", 
    "الشرقية", "المنوفية", "الفيوم", "كفر الشيخ", "قنا", 
    "اسوان", "المنيا", "الاسكندريه", "الاسماعيليه", "القليوبية"
];

const eventTypes = ["اونلاين", "اوفلاين"];
const eventResults = ["تم", "لم يتم"];


export function PlanForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [govDisplay, setGovDisplay] = React.useState("...............");
  const [showEventForm, setShowEventForm] = React.useState(false);
  const [showSignatures, setShowSignatures] = React.useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = React.useState(false);
  
  const [editingEventIndex, setEditingEventIndex] = React.useState<number | null>(null);

  const initialNewEventState = { details: "", date: "", type: "", result: "" };
  const initialNewDateState = { day: "", month: "", year: new Date().getFullYear().toString() };

  // State for the new/editing event being created
  const [newEvent, setNewEvent] = React.useState(initialNewEventState);
  const [newDate, setNewDate] = React.useState(initialNewDateState);

  const [telegramUser, setTelegramUser] = useState<any>(null);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
      }
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      governorate: "",
      month: "",
      events: [],
      deputies: [{ name: "" }],
      president: "",
    },
  });
  
  const selectedMonth = form.watch("month");

  const { fields: eventFields, append: appendEvent, remove: removeEvent, update: updateEvent } = useFieldArray({
    control: form.control,
    name: "events",
  });

  const { fields: deputyFields, append: appendDeputy, remove: removeDeputy } = useFieldArray({
    control: form.control,
    name: "deputies",
  });

  const handleSaveEvent = () => {
    const fullDate = newDate.day && newDate.month && newDate.year ? `${newDate.day}/${newDate.month}/${newDate.year}` : "";
    const eventToSave = { ...newEvent, date: fullDate };

    if (!eventToSave.details || !eventToSave.date || !eventToSave.type || !eventToSave.result) {
        toast({
            title: "بيانات غير مكتملة",
            description: "الرجاء ملء جميع حقول الفعالية قبل الحفظ.",
            variant: "destructive",
        });
        return;
    }

    if (editingEventIndex !== null) {
      updateEvent(editingEventIndex, eventToSave);
    } else {
      appendEvent(eventToSave);
    }

    // Reset form and state
    setNewEvent(initialNewEventState);
    setNewDate(initialNewDateState);
    setShowEventForm(false);
    setEditingEventIndex(null);
  };
  
  const handleAddNewEventClick = () => {
    const monthIndex = months.indexOf(selectedMonth);
    const monthNumber = monthIndex !== -1 ? (monthIndex + 1).toString() : "";
    
    setEditingEventIndex(null);
    setNewEvent(initialNewEventState);
    setNewDate({
      day: "",
      month: monthNumber,
      year: new Date().getFullYear().toString(),
    });
    setShowEventForm(true);
  };

  const handleEditEventClick = (index: number) => {
    const eventToEdit = eventFields[index];
    const [day, month, year] = eventToEdit.date.split('/');

    setEditingEventIndex(index);
    setNewEvent({
      details: eventToEdit.details,
      date: eventToEdit.date,
      type: eventToEdit.type,
      result: eventToEdit.result,
    });
    setNewDate({ day, month, year });
    setShowEventForm(true);
  };

  const handleShowSignatures = () => {
      setShowSignatures(true);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const submissionData = {
        governorate: values.governorate,
        month: values.month,
        presidentSign: values.president,
        deputySigns: values.deputies.map(d => d.name).filter(Boolean),
        events: values.events.map(e => ({ name: e.details, date: e.date, type: e.type, result: e.result })),
        telegramUser: telegramUser ? {
          id: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
        } : null,
      };
      
      const result = await submitPlan(submissionData as any);
      if (result.success) {
        setShowSuccessOverlay(true);
        setTimeout(() => {
          if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
          }
        }, 2000);

      } else {
        toast({
          title: "خطأ!",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  }
  
  const DateSelector = ({ value, onChange }: { value: {day: string, month: string, year: string}, onChange: (date: {day: string, month: string, year: string}) => void }) => {
    return (
      <div className="flex gap-2 justify-center">
        <Select onValueChange={(day) => onChange({...value, day})} value={value.day}>
          <SelectTrigger><SelectValue placeholder="اليوم" /></SelectTrigger>
          <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i+1} value={`${i+1}`}>{i+1}</SelectItem>)}</SelectContent>
        </Select>
        <Select onValueChange={(month) => onChange({...value, month})} value={value.month}>
          <SelectTrigger><SelectValue placeholder="الشهر" /></SelectTrigger>
          <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i+1} value={`${i+1}`}>{i+1}</SelectItem>)}</SelectContent>
        </Select>
         <Select onValueChange={(year) => onChange({...value, year})} value={value.year}>
          <SelectTrigger><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>{Array.from({ length: 6 }, (_, i) => <SelectItem key={i} value={`${new Date().getFullYear() + i}`}>{new Date().getFullYear() + i}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  };
  
  if (showSuccessOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-600 text-white">
        <CheckCircle2 className="h-24 w-24 mb-6 animate-pulse" />
        <h2 className="text-4xl font-bold mb-2">تم الإرسال بنجاح!</h2>
        <p className="text-xl">سيتم إغلاق الواجهة الآن...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <h3 className="text-3xl font-bold text-center text-primary my-6">تقرير الشهر المركزي</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg mb-8 p-4 bg-muted/50 rounded-md">
            <FormField
              control={form.control}
              name="governorate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">المحافظة:</FormLabel>
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      setGovDisplay(value || "...............");
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {governorates.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">الشهر:</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="اختر الشهر" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <div className="text-foreground text-sm leading-relaxed mb-6 text-center space-y-2 bg-muted/50 p-3 rounded-md">
            <p>تقرير شهر <span className="font-bold text-primary">{selectedMonth || "................"}</span></p>
            <p>مقدم من لجنة التنظيم بمحافظة <span className="font-bold text-primary">{govDisplay}</span>.</p>
            <p className="font-semibold">إلى السادة:</p>
            <ul className="list-none p-0 m-0 text-xs text-muted-foreground">
                <li>القائد/ <strong className="text-foreground">إسلام فارس</strong> (رئيس لجنة التنظيم المركزية)</li>
                <li>القائد/ <strong className="text-foreground">ريم منصور</strong> (نائب رئيس اللجنة)</li>
                <li>القائد/ <strong className="text-foreground">أحمد حسن</strong> (نائب رئيس اللجنة)</li>
            </ul>
        </div>

        {/* Events Section */}
        <div className="space-y-4">
            <h3 className="text-xl text-foreground font-bold text-center">الأحداث</h3>
            {eventFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md bg-muted/50 relative">
                 <div className="mb-2">
                    <p className="font-bold">الفعالية #{index + 1}:</p>
                    <p>{field.details}</p>
                </div>
                <p><strong>التاريخ:</strong> {field.date}</p>
                <p><strong>النوع:</strong> {field.type}</p>
                <p><strong>النتيجة:</strong> {field.result}</p>
                 <div className="absolute top-2 left-2 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-8 w-8"
                      onClick={() => handleEditEventClick(index)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full h-8 w-8"
                      onClick={() => removeEvent(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}
             <FormMessage>{form.formState.errors.events?.root?.message || form.formState.errors.events?.message}</FormMessage>

            {showEventForm && (
                <div className="p-4 border rounded-md mt-4 space-y-4">
                    <h4 className="font-bold text-lg">{editingEventIndex !== null ? 'تعديل التقرير' : 'إضافة تقرير جديد'}</h4>
                    <FormItem>
                      <FormLabel>ما هو الحدث؟</FormLabel>
                      <FormControl>
                          <Input 
                              placeholder="تفاصيل الحدث" 
                              value={newEvent.details}
                              onChange={(e) => setNewEvent({...newEvent, details: e.target.value})}
                          />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>متى سيقام الحدث؟</FormLabel>
                       <FormControl>
                          <DateSelector value={newDate} onChange={setNewDate} />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>ما هو نوع الحدث؟</FormLabel>
                      <Select 
                          onValueChange={(value) => setNewEvent({...newEvent, type: value})} 
                          value={newEvent.type}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger></FormControl>
                        <SelectContent>{eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                    <FormItem>
                      <FormLabel>نتيجة الحدث</FormLabel>
                      <Select 
                          onValueChange={(value) => setNewEvent({...newEvent, result: value})} 
                          value={newEvent.result}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر النتيجة" /></SelectTrigger></FormControl>
                        <SelectContent>{eventResults.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                    <Button type="button" onClick={handleSaveEvent}>حفظ الفعالية</Button>
                </div>
            )}
             <div className="mt-4 text-center">
                <Button type="button" onClick={handleAddNewEventClick} variant="secondary" disabled={showEventForm || !selectedMonth}>
                  اضافة تقرير
                </Button>
            </div>
        </div>


        {/* Signatures Section */}
        <footer className="mt-10 pt-6 border-t">
             {!showSignatures ? (
                <div className="text-center">
                    <Button
                        type="button"
                        onClick={handleShowSignatures}
                        variant="secondary"
                        className="font-bold"
                        disabled={eventFields.length === 0}
                    >
                        إضافة التوقيعات
                    </Button>
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="text-center">
                    <p className="font-bold text-lg">نائب رئيس اللجنة</p>
                    <div className="space-y-2 mt-4 mx-auto max-w-xs">
                        {deputyFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2">
                              <FormField
                                control={form.control}
                                name={`deputies.${index}.name`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                          <Input placeholder={`اسم النائب ${deputyFields.length > 1 ? index + 1 : ''}`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                               />
                               {deputyFields.length > 1 && (
                                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive/90 p-1" onClick={() => removeDeputy(index)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                               )}
                          </div>
                        ))}
                    </div>
                     <FormMessage>{form.formState.errors.deputies?.root?.message || form.formState.errors.deputies?.message}</FormMessage>
                    <Button type="button" onClick={() => appendDeputy({ name: "" })} className="mt-2" variant="outline" size="sm">
                        + إضافة نائب آخر
                    </Button>
                </div>
                 <div className="text-center">
                    <p className="font-bold text-lg">رئيس لجنة التنظيم</p>
                     <FormField
                        control={form.control}
                        name="president"
                        render={({ field }) => (
                            <FormItem className="mt-4 mx-auto max-w-xs">
                                <FormControl>
                                    <Input placeholder="الاسم" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                     />
                </div>
            </div>
             )}
        </footer>


        <div className="mt-12 text-center">
          <Button type="submit" size="lg" disabled={isPending || !showSignatures || eventFields.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition shadow-lg w-auto">
            {isPending ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                <span>جاري التحميل...</span>
              </>
            ) : (
              "تنزيل التقرير pdf"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
