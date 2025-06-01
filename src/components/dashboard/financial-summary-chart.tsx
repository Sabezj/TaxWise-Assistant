
"use client"

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import type { FinancialData } from "@/types";
import { PackageOpen, Briefcase, TrendingUp as TrendingUpIcon, Landmark, PiggyBank, Home, Users, Activity, Building } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

interface FinancialSummaryChartProps {
  financialData: FinancialData | null;
}

const chartConfigTemplate = (t: Function): ChartConfig => ({
  jobIncome: { label: t('chartLabels.income.job'), color: "hsl(var(--chart-1))", icon: Briefcase },
  investmentsIncome: { label: t('chartLabels.income.investments'), color: "hsl(var(--chart-2))", icon: TrendingUpIcon },
  propertyIncome: { label: t('chartLabels.income.property'), color: "hsl(var(--chart-3))", icon: Building },
  creditsIncome: { label: t('chartLabels.income.credits'), color: "hsl(var(--chart-4))", icon: Landmark },
  medicalExpenses: { label: t('chartLabels.expenses.medical'), color: "hsl(var(--chart-5))", icon: Activity },
  educationalExpenses: { label: t('chartLabels.expenses.educational'), color: "hsl(var(--chart-1))", icon: PiggyBank },
  socialExpenses: { label: t('chartLabels.expenses.social'), color: "hsl(var(--chart-2))", icon: Users },
  propertyExpenses: { label: t('chartLabels.expenses.property'), color: "hsl(var(--chart-3))", icon: Home },
});

export function FinancialSummaryChart({ financialData }: FinancialSummaryChartProps) {
  const { t, formatCurrency, currency: globalDisplayCurrency } = useI18n();
  const localizedChartConfig = chartConfigTemplate(t);

  const isEffectivelyEmpty = (data: FinancialData | null): boolean => {
    if (!data) return true;
    const { income, expenses } = data;
    return (
      income.job.value === 0 &&
      income.investments.value === 0 &&
      income.propertyIncome.value === 0 &&
      income.credits.value === 0 &&
      expenses.medical.value === 0 &&
      expenses.educational.value === 0 &&
      expenses.social.value === 0 &&
      expenses.property.value === 0
    );
  };

  if (!financialData || isEffectivelyEmpty(financialData)) {
    return (
        <div className="flex flex-col items-center justify-center h-60 text-center p-4 border border-dashed rounded-lg">
            <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noFinancialDataMessage')}</p>
            <p className="text-sm text-muted-foreground">
            {t('enterDataToSeeFinancialChartMessage')}
            ({t('chartLabels.noDataInSelectedCurrency', { currency: globalDisplayCurrency })})
            </p>
        </div>
    );
  }

  const chartData = [];

  if (financialData?.income) {
    if (financialData.income.job.value > 0) chartData.push({ name: t('chartLabels.income.job').substring(0,10), value: financialData.income.job.value, fill: localizedChartConfig.jobIncome?.color, labelKey: 'jobIncome', type: 'income' });
    if (financialData.income.investments.value > 0) chartData.push({ name: t('chartLabels.income.investments').substring(0,10), value: financialData.income.investments.value, fill: localizedChartConfig.investmentsIncome?.color, labelKey: 'investmentsIncome', type: 'income' });
    if (financialData.income.propertyIncome.value > 0) chartData.push({ name: t('chartLabels.income.property').substring(0,10), value: financialData.income.propertyIncome.value, fill: localizedChartConfig.propertyIncome?.color, labelKey: 'propertyIncome', type: 'income' });
    if (financialData.income.credits.value > 0) chartData.push({ name: t('chartLabels.income.credits').substring(0,10), value: financialData.income.credits.value, fill: localizedChartConfig.creditsIncome?.color, labelKey: 'creditsIncome', type: 'income' });
  }
  if (financialData?.expenses) {
    if (financialData.expenses.medical.value > 0) chartData.push({ name: t('chartLabels.expenses.medical').substring(0,10), value: financialData.expenses.medical.value, fill: localizedChartConfig.medicalExpenses?.color, labelKey: 'medicalExpenses', type: 'expense' });
    if (financialData.expenses.educational.value > 0) chartData.push({ name: t('chartLabels.expenses.educational').substring(0,10), value: financialData.expenses.educational.value, fill: localizedChartConfig.educationalExpenses?.color, labelKey: 'educationalExpenses', type: 'expense' });
    if (financialData.expenses.social.value > 0) chartData.push({ name: t('chartLabels.expenses.social').substring(0,10), value: financialData.expenses.social.value, fill: localizedChartConfig.socialExpenses?.color, labelKey: 'socialExpenses', type: 'expense' });
    if (financialData.expenses.property.value > 0) chartData.push({ name: t('chartLabels.expenses.property').substring(0,10), value: financialData.expenses.property.value, fill: localizedChartConfig.propertyExpenses?.color, labelKey: 'propertyExpenses', type: 'expense' });
  }

  if (chartData.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-60 text-center p-4 border border-dashed rounded-lg">
            <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noFinancialDataMessage')}</p>
            <p className="text-sm text-muted-foreground">
            {t('chartLabels.noDataInSelectedCurrency', { currency: globalDisplayCurrency })}
            </p>
        </div>
    );
  }

  return (
    <ChartContainer config={localizedChartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            style={{ fontSize: '0.75rem' }}
            />
            <YAxis
            tickFormatter={(value) => formatCurrency(Number(value), globalDisplayCurrency)}
            tickLine={false}
            axisLine={false}
            width={80}
            style={{ fontSize: '0.75rem' }}
            />
            <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent
                formatter={(value, name, props) => {
                    const itemLabelKey = props.payload.labelKey as keyof typeof localizedChartConfig;
                    const Icon = localizedChartConfig[itemLabelKey]?.icon;
                    return (
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground flex items-center">
                              {Icon && <Icon className="mr-1.5 h-3 w-3" />}
                              {localizedChartConfig[itemLabelKey]?.label || name}
                            </span>
                            <span className="font-bold">{formatCurrency(Number(value), globalDisplayCurrency)}</span>
                        </div>
                    )
                }}
                indicator="dot"
            />}
            />
            <Legend
            content={({ payload }) => (
                <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap mt-4">
                {payload?.map((entry, index) => {
                    const originalPayloadEntry = chartData.find(d => localizedChartConfig[d.labelKey as keyof typeof localizedChartConfig]?.label === entry.value);
                    const configKey = originalPayloadEntry?.labelKey as keyof typeof localizedChartConfig | undefined;

                    if (!configKey || !localizedChartConfig[configKey]) return null;
                     const Icon = localizedChartConfig[configKey]?.icon;

                    return (
                        <div key={`item-${index}`} className="flex items-center space-x-1 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
                        <span>{localizedChartConfig[configKey]?.label || entry.value}</span>
                        </div>
                    );
                })}
                </div>
            )}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
        </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
