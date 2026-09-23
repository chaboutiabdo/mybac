import { useState } from "react";
import { BookX } from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import MistakeCard from "@/components/mistakes/MistakeCard";
import FilterPills, { SUBJECT_OPTIONS } from "@/components/FilterPills";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMistakes, type MistakeStatusFilter } from "@/hooks/useMistakes";

const MyMistakes = () => {
  const [status, setStatus] = useState<MistakeStatusFilter>("active");
  const [subject, setSubject] = useState<string | null>(null);
  const { mistakes, loading, error, refetch, markReviewed } = useMistakes({ status, subject });

  return (
    <div className="space-y-8">
      <PageHeader title="أخطائي" subtitle="الأسئلة التي أخطأت فيها في الاختبارات، مع شرح بالذكاء الاصطناعي" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as MistakeStatusFilter)}>
          <TabsList>
            <TabsTrigger value="active">نشطة</TabsTrigger>
            <TabsTrigger value="resolved">تم حلّها</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>
        </Tabs>
        <FilterPills options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} label="تصفية حسب المادة" />
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState description={error} onRetry={refetch} />
      ) : mistakes.length === 0 ? (
        <EmptyState
          icon={BookX}
          title={status === "active" ? "لا توجد أخطاء نشطة" : "لا توجد نتائج"}
          description="أخطاؤك في الاختبارات تظهر هنا تلقائياً بعد كل اختبار."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {mistakes.map((m) => (
            <MistakeCard key={m.id} mistake={m} onMarkReviewed={markReviewed} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyMistakes;
