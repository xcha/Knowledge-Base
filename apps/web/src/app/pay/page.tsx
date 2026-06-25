"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PayPage() {
  const searchParams = useSearchParams();

  const formHtml = useMemo(() => {
    const html = searchParams.get("form");
    return html ? decodeURIComponent(html) : "";
  }, [searchParams]);

  const error = useMemo(() => {
    return formHtml ? "" : "支付参数缺失";
  }, [formHtml]);

  useEffect(() => {
    if (formHtml) {
      const timer = setTimeout(() => {
        const form = document.getElementById("alipay-form") as HTMLFormElement;
        if (form) form.submit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formHtml]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">正在跳转到支付宝...</p>
        {formHtml && <div dangerouslySetInnerHTML={{ __html: formHtml }} />}
      </div>
    </div>
  );
}
