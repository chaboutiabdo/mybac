import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <FileQuestion
          className="mx-auto mb-5 h-8 w-8 text-muted-foreground"
          strokeWidth={1.4}
          aria-hidden
        />
        <p className="text-base font-semibold tracking-widest text-muted-foreground tabular">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
          الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2.5">
          <Link to="/home">
            <Button>العودة إلى الرئيسية</Button>
          </Link>
          <Link to="/exams">
            <Button variant="outline">تصفّح الامتحانات</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
