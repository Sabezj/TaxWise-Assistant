
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Zap, AlertTriangle, SearchX } from "lucide-react";
import type { SuggestDeductionsOutput } from "@/ai/flows/suggest-deductions";
import { useI18n } from "@/contexts/i18n-context";

interface DeductionSuggestionsProps {
  suggestions?: SuggestDeductionsOutput;
  isLoading: boolean;
  error?: string | null;
}

export function DeductionSuggestions({ suggestions, isLoading, error }: DeductionSuggestionsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 space-x-2">
        <Zap className="h-6 w-6 animate-pulse text-primary" />
        <p className="text-muted-foreground">{t("dashboard.deductionSuggestions.generating")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("dashboard.deductionSuggestions.errorTitle")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (suggestions && suggestions.suggestedDeductions.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <SearchX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <AlertTitle className="font-semibold mb-1">{t("dashboard.deductionSuggestions.empty.noNewDeductionsTitle")}</AlertTitle>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.deductionSuggestions.empty.noNewDeductionsDescription")}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("dashboard.deductionSuggestions.empty.noNewDeductionsHint")}
        </p>
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <AlertTitle className="font-semibold mb-1">{t("dashboard.deductionSuggestions.empty.notRunTitle")}</AlertTitle>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.deductionSuggestions.empty.notRunDescription")}
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {suggestions.summary && (
        <Alert className="bg-accent/50 border-accent">
           <Lightbulb className="h-4 w-4 text-accent-foreground" />
          <AlertTitle className="text-accent-foreground">{t("dashboard.deductionSuggestions.aiSummaryTitle")}</AlertTitle>
          <AlertDescription className="text-accent-foreground/80">
            {suggestions.summary}
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="single" collapsible className="w-full">
        {suggestions.suggestedDeductions.map((deduction, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger className="text-base hover:no-underline">
              <div className="flex items-center">
                <Zap className="h-5 w-5 mr-3 text-primary" />
                {deduction.split(':')[0] || t("dashboard.deductionSuggestions.potentialDeductionPrefix", { index: index + 1})}
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pl-8">
              {deduction.includes(':') ? deduction.substring(deduction.indexOf(':') + 1).trim() : deduction}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
       <p className="text-xs text-muted-foreground text-center pt-4">
        {t("dashboard.deductionSuggestions.disclaimer")}
      </p>
    </div>
  );
}


    