"use client";

import { countries } from "@business-operations/location/countries-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@business-operations/ui/card";
import { ComboboxDropdown } from "@business-operations/ui/combobox-dropdown";
import { useUserMutation, useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";

export function LocaleSettings() {
  const t = useI18n();
  const { data: user } = useUserQuery();
  const updateUserMutation = useUserMutation();

  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const localeItems = [...new Set(Object.values(countries).map(country => country.default_locale))].map(locale => ({
    id: locale,
    label: `${names.of(locale) || locale} (${locale})`,
    value: locale,
  }));

  return (
    <Card className="flex justify-between items-center">
      <CardHeader>
        <CardTitle>{t("locale.title")}</CardTitle>
        <CardDescription>{t("locale.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="w-[250px]">
          <ComboboxDropdown
            placeholder={t("locale.placeholder")}
            selectedItem={localeItems.find(
              (item) => item.value === user?.locale,
            )}
            searchPlaceholder={t("locale.searchPlaceholder")}
            items={localeItems}
            className="text-xs py-1"
            onSelect={(item) => {
              updateUserMutation.mutate({ locale: item.value });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
