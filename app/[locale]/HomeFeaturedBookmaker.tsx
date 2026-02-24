import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { BookmakerLink } from "@/lib/components/BookmakerLink";
import { getTranslations } from "next-intl/server";

interface HomeFeaturedBookmakerProps {
  country: string;
  locale?: string;
}

export default async function HomeFeaturedBookmaker({ country, locale }: HomeFeaturedBookmakerProps) {
  const featured = getFeaturedBookmaker(country);
  if (!featured) return null;

  const t = await getTranslations("home");
  const buttonText = featured.buttonText || t("claimBonus");

  const isOrange = featured.buttonColor === "orange";
  const bgClass = isOrange ? "bg-[#f57003] hover:bg-[#f57003]/90" : "bg-[#ffe71e] hover:bg-[#ffe71e]/90";

  return (
    <BookmakerLink
      href={featured.bonusUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      bookmakerName={featured.name}
      locale={locale}
      className={`mt-6 flex flex-col items-center gap-0.5 rounded-xl border-2 border-black/25 p-4 shadow-sm transition md:mt-8 md:flex-row md:items-center md:justify-between md:gap-6 md:p-5 ${bgClass}`}
    >
      <div className="flex items-center gap-3">
        {(featured.faviconUrl || featured.logoUrl) && (
          <img
            src={featured.faviconUrl || featured.logoUrl!}
            alt=""
            className="h-10 w-10 shrink-0 object-contain md:h-12 md:w-12"
          />
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-black/95 md:text-xs">
            {t("featuredBookmaker")}
          </p>
          <h3 className="text-base font-extrabold text-black md:text-lg">
            {featured.name}
          </h3>
          {featured.bonusDescription && (
            <p className="mt-0.5 text-sm text-black/95 md:text-base">
              {featured.bonusDescription}
            </p>
          )}
        </div>
      </div>
      <span className={`group flex shrink-0 overflow-hidden rounded-lg border-2 border-black transition hover:bg-black md:min-w-[200px]`}>
        {(featured.faviconUrl || featured.logoUrl) && (
          <div className="flex shrink-0 items-center justify-center border-r-2 border-black bg-white px-3 py-2.5 md:px-4 md:py-3">
            <img
              src={featured.faviconUrl || featured.logoUrl!}
              alt=""
              className="h-6 w-6 object-contain md:h-7 md:w-7"
            />
          </div>
        )}
        <span className={`flex flex-1 items-center justify-center px-5 py-2.5 text-sm font-extrabold text-black transition md:px-6 md:py-3 md:text-base ${isOrange ? "group-hover:text-[#f57003]" : "group-hover:text-[#ffe71e]"}`}>
          {buttonText}
        </span>
      </span>
    </BookmakerLink>
  );
}
