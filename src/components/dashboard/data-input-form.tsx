
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinancialData, IncomeData, ExpenseData, MonetaryAmount, Currency } from "@/types";
import { Save, Briefcase, TrendingUp as TrendingUpIcon, Landmark, PiggyBank, Home, Users, Activity, HelpCircle, Building, Euro, RussianRuble, CircleDollarSign } from "lucide-react";
import { useI18n, AvailableCurrencies } from "@/contexts/i18n-context";
import { Separator } from "@/components/ui/separator";

const monetaryAmountSchema = (t: Function, defaultCurrency: Currency) => z.object({
  value: z.coerce.number().min(0, { message: t("validation.minZero") }).default(0),
  currency: z.nativeEnum(AvailableCurrencies).default(defaultCurrency),
});

const incomeSchema = (t: Function, defaultCurrency: Currency) => z.object({
  job: monetaryAmountSchema(t, defaultCurrency),
  investments: monetaryAmountSchema(t, defaultCurrency),
  propertyIncome: monetaryAmountSchema(t, defaultCurrency),
  credits: monetaryAmountSchema(t, defaultCurrency),
  otherIncomeDetails: z.string().optional().default(""),
});

const expenseSchema = (t: Function, defaultCurrency: Currency) => z.object({
  medical: monetaryAmountSchema(t, defaultCurrency),
  educational: monetaryAmountSchema(t, defaultCurrency),
  social: monetaryAmountSchema(t, defaultCurrency),
  property: monetaryAmountSchema(t, defaultCurrency),
  otherExpensesDetails: z.string().optional().default(""),
});

const formSchema = (t: Function, defaultCurrency: Currency) => z.object({
  income: incomeSchema(t, defaultCurrency),
  expenses: expenseSchema(t, defaultCurrency),
});

type FormSchemaType = ReturnType<typeof formSchema>;

const getDefaultMonetaryAmount = (initialValue: number | undefined, initialCurrency: Currency | undefined, defaultGlobalCurrency: Currency): MonetaryAmount => ({
  value: initialValue ?? 0,
  currency: initialCurrency ?? defaultGlobalCurrency,
});

const getDefaultValues = (initialData?: Partial<FinancialData> | null, defaultGlobalCurrency: Currency = 'USD'): z.infer<FormSchemaType> => ({
  income: {
    job: getDefaultMonetaryAmount(initialData?.income?.job?.value, initialData?.income?.job?.currency, defaultGlobalCurrency),
    investments: getDefaultMonetaryAmount(initialData?.income?.investments?.value, initialData?.income?.investments?.currency, defaultGlobalCurrency),
    propertyIncome: getDefaultMonetaryAmount(initialData?.income?.propertyIncome?.value, initialData?.income?.propertyIncome?.currency, defaultGlobalCurrency),
    credits: getDefaultMonetaryAmount(initialData?.income?.credits?.value, initialData?.income?.credits?.currency, defaultGlobalCurrency),
    otherIncomeDetails: initialData?.income?.otherIncomeDetails || "",
  },
  expenses: {
    medical: getDefaultMonetaryAmount(initialData?.expenses?.medical?.value, initialData?.expenses?.medical?.currency, defaultGlobalCurrency),
    educational: getDefaultMonetaryAmount(initialData?.expenses?.educational?.value, initialData?.expenses?.educational?.currency, defaultGlobalCurrency),
    social: getDefaultMonetaryAmount(initialData?.expenses?.social?.value, initialData?.expenses?.social?.currency, defaultGlobalCurrency),
    property: getDefaultMonetaryAmount(initialData?.expenses?.property?.value, initialData?.expenses?.property?.currency, defaultGlobalCurrency),
    otherExpensesDetails: initialData?.expenses?.otherExpensesDetails || "",
  },
});


interface DataInputFormProps {
  initialData?: FinancialData | null;
  onSubmit: (data: FinancialData) => Promise<void>;
  isSubmitting?: boolean;
}

export function DataInputForm({ initialData, onSubmit, isSubmitting }: DataInputFormProps) {
  const { t, currency: globalCurrency } = useI18n();
  const currentFormSchema = formSchema(t, globalCurrency);

  const form = useForm<z.infer<typeof currentFormSchema>>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: getDefaultValues(initialData, globalCurrency),
  });

  const [isEffectivelyEmpty, setIsEffectivelyEmpty] = React.useState(true);
  const watchedValues = form.watch();

  React.useEffect(() => {
    const checkFormEffectivelyEmpty = (values: z.infer<typeof currentFormSchema>): boolean => {
      const { income, expenses } = values;
      const allIncomeValues = [
        income.job.value,
        income.investments.value,
        income.propertyIncome.value,
        income.credits.value,
      ];
      const allExpenseValues = [
        expenses.medical.value,
        expenses.educational.value,
        expenses.social.value,
        expenses.property.value,
      ];
      return ![...allIncomeValues, ...allExpenseValues].some(val => val > 0);
    };
    setIsEffectivelyEmpty(checkFormEffectivelyEmpty(watchedValues));
  }, [watchedValues]);
  
  React.useEffect(() => {
    // Reset form when initialData changes (e.g., data cleared from parent)
    // or when globalCurrency changes and form should adopt it for new entries.
    form.reset(getDefaultValues(initialData, globalCurrency));
  }, [initialData, form, globalCurrency]);


  const handleFormSubmit = async (values: z.infer<typeof currentFormSchema>) => {
    await onSubmit(values as FinancialData);
    // Reset the form to default empty values after successful submission
    form.reset(getDefaultValues(undefined, globalCurrency));
  };

  const incomeFields: { name: keyof Omit<IncomeData, 'otherIncomeDetails'>; labelKey: string; descKey: string; placeholderKey: string; icon: React.ElementType}[] = [
    { name: "job", labelKey: "dashboard.dataInputForm.income.jobLabel", descKey: "dashboard.dataInputForm.income.jobDescription", placeholderKey: "dashboard.dataInputForm.income.jobPlaceholder", icon: Briefcase },
    { name: "investments", labelKey: "dashboard.dataInputForm.income.investmentsLabel", descKey: "dashboard.dataInputForm.income.investmentsDescription", placeholderKey: "dashboard.dataInputForm.income.investmentsPlaceholder", icon: TrendingUpIcon },
    { name: "propertyIncome", labelKey: "dashboard.dataInputForm.income.propertyLabel", descKey: "dashboard.dataInputForm.income.propertyDescription", placeholderKey: "dashboard.dataInputForm.income.propertyPlaceholder", icon: Building },
    { name: "credits", labelKey: "dashboard.dataInputForm.income.creditsLabel", descKey: "dashboard.dataInputForm.income.creditsDescription", placeholderKey: "dashboard.dataInputForm.income.creditsPlaceholder", icon: Landmark },
  ];

  const expenseFields: { name: keyof Omit<ExpenseData, 'otherExpensesDetails'>; labelKey: string; descKey: string; placeholderKey: string; icon: React.ElementType }[] = [
    { name: "medical", labelKey: "dashboard.dataInputForm.expenses.medicalLabel", descKey: "dashboard.dataInputForm.expenses.medicalDescription", placeholderKey: "dashboard.dataInputForm.expenses.medicalPlaceholder", icon: Activity },
    { name: "educational", labelKey: "dashboard.dataInputForm.expenses.educationalLabel", descKey: "dashboard.dataInputForm.expenses.educationalDescription", placeholderKey: "dashboard.dataInputForm.expenses.educationalPlaceholder", icon: PiggyBank },
    { name: "social", labelKey: "dashboard.dataInputForm.expenses.socialLabel", descKey: "dashboard.dataInputForm.expenses.socialDescription", placeholderKey: "dashboard.dataInputForm.expenses.socialPlaceholder", icon: Users },
    { name: "property", labelKey: "dashboard.dataInputForm.expenses.propertyLabel", descKey: "dashboard.dataInputForm.expenses.propertyDescription", placeholderKey: "dashboard.dataInputForm.expenses.propertyPlaceholder", icon: Home },
  ];

  const renderMonetaryAmountField = (
    category: 'income' | 'expenses',
    fieldInfo: typeof incomeFields[number] | typeof expenseFields[number],
    control: any, 
  ) => {
    const fieldName = `${category}.${fieldInfo.name}` as const;
    return (
      <FormField
        key={fieldName}
        control={control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center">
              <fieldInfo.icon className="mr-2 h-4 w-4 text-muted-foreground" /> {t(fieldInfo.labelKey)}
            </FormLabel>
            <div className="flex space-x-2">
              <FormControl className="flex-grow">
                <Input
                  type="number"
                  placeholder={t(fieldInfo.placeholderKey)}
                  value={field.value.value}
                  onChange={(e) => field.onChange({ ...field.value, value: parseFloat(e.target.value) || 0 })}
                  min="0" // Ensure non-negative values
                />
              </FormControl>
              <Controller
                control={control}
                name={`${fieldName}.currency` as any} 
                render={({ field: currencyField }) => (
                  <Select 
                    value={currencyField.value} 
                    onValueChange={(val) => currencyField.onChange(val as Currency)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder={t("dashboard.dataInputForm.selectCurrency")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(AvailableCurrencies).map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <FormDescription>{t(fieldInfo.descKey)}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        
        <div>
          <h3 className="text-xl font-semibold mb-4 text-foreground">{t("dashboard.dataInputForm.incomeTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {incomeFields.map(fieldInfo => renderMonetaryAmountField('income', fieldInfo, form.control))}
          </div>
          <FormField
            control={form.control}
            name="income.otherIncomeDetails"
            render={({ field }) => (
              <FormItem className="mt-6">
                <FormLabel className="flex items-center"><HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />{t("dashboard.dataInputForm.income.otherLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("dashboard.dataInputForm.income.otherPlaceholder")}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("dashboard.dataInputForm.income.otherDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-8" />

        <div>
          <h3 className="text-xl font-semibold mb-4 text-foreground">{t("dashboard.dataInputForm.expensesTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {expenseFields.map(fieldInfo => renderMonetaryAmountField('expenses', fieldInfo, form.control))}
          </div>
          <FormField
            control={form.control}
            name="expenses.otherExpensesDetails"
            render={({ field }) => (
              <FormItem className="mt-6">
                <FormLabel className="flex items-center"><HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />{t("dashboard.dataInputForm.expenses.otherLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("dashboard.dataInputForm.expenses.otherPlaceholder")}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("dashboard.dataInputForm.expenses.otherDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full md:w-auto mt-8" disabled={isSubmitting || isEffectivelyEmpty}>
          {isSubmitting ? t("dashboard.dataInputForm.savingButton") : <><Save className="mr-2 h-4 w-4" /> {t("dashboard.dataInputForm.saveButton")}</>}
        </Button>
      </form>
    </Form>
  );
}

    