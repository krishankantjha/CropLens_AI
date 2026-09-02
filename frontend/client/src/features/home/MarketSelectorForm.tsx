import type { FormEvent } from "react";

import { ArrowRight, CalendarDays, ChevronDown, Leaf, RotateCcw, Sparkles } from "lucide-react";

import { MandiCombobox } from "./MandiCombobox";

import { StatePanel } from "@/components/feedback/StatePanel";

import { useLanguage } from "@/contexts/LanguageContext";

import type { ApiError, ResourceOption } from "@/types/api";



type MarketSelectorFormProps = {

  commodities: ResourceOption[];

  markets: ResourceOption[];

  commodity: string;

  market: string;

  horizon: number;

  popularCrops: string[];

  recentCommodityIds: string[];

  recentMarketIds: string[];

  resourceLoading: boolean;

  resourceError: ApiError | null;

  resourceUnavailable: boolean;

  forecastLoading: boolean;

  hasSelection: boolean;

  validSelection: boolean;

  compact: boolean;

  contextExpanded: boolean;

  mandiFocusRequest: number;

  onCommodityChange: (value: string) => void;

  onMarketChange: (value: string) => void;

  onHorizonChange: (value: number) => void;

  onPopularCropSelect: (cropId: string) => void;

  onToggleContextExpanded: () => void;

  onCheckAnotherCrop: () => void;

  onSubmit: (event?: FormEvent) => void;

  onRetryResources: () => void;

};



function MarketFields({

  commodities,

  markets,

  commodity,

  market,

  horizon,

  popularCrops,

  recentCommodityIds,

  recentMarketIds,

  resourceLoading,

  resourceError,

  forecastLoading,

  hasSelection,

  validSelection,

  showPopularCrops,

  showHorizon,

  mandiFocusRequest,

  onCommodityChange,

  onMarketChange,

  onHorizonChange,

  onPopularCropSelect,

  onSubmit,

  formClassName,

}: Pick<

  MarketSelectorFormProps,

  | "commodities"

  | "markets"

  | "commodity"

  | "market"

  | "horizon"

  | "popularCrops"

  | "recentCommodityIds"

  | "recentMarketIds"

  | "resourceLoading"

  | "resourceError"

  | "forecastLoading"

  | "hasSelection"

  | "validSelection"

  | "mandiFocusRequest"

  | "onCommodityChange"

  | "onMarketChange"

  | "onHorizonChange"

  | "onPopularCropSelect"

  | "onSubmit"

> & { showPopularCrops: boolean; showHorizon: boolean; formClassName: string }) {

  const { t } = useLanguage();

  const recentCommodities = recentCommodityIds

    .map((id) => commodities.find((item) => item.id === id))

    .filter((item): item is ResourceOption => Boolean(item));

  const otherCommodities = commodities.filter((item) => !recentCommodityIds.includes(item.id));



  return (

    <>

      {showPopularCrops ? (

        <div className="crop-chips" aria-label={t("popularCrops")}>

          <span className="chip-label">{t("popularCrops")}</span>

          {popularCrops.map((cropId) => {

            const crop = commodities.find((item) => item.id === cropId);

            return crop ? (

              <button

                className={`crop-chip${commodity === crop.id ? " crop-chip--active" : ""}`}

                key={crop.id}

                type="button"

                onClick={() => onPopularCropSelect(crop.id)}

                disabled={resourceLoading || !!resourceError}

                aria-pressed={commodity === crop.id}

              >

                {crop.label}

              </button>

            ) : null;

          })}

        </div>

      ) : null}

      <form className={formClassName} onSubmit={onSubmit}>

        <label className="field">

          <span>{t("crop")}</span>

          <span className="select-wrap">

            <Leaf size={18} />

            <select

              value={commodity}

              onChange={(event) => onCommodityChange(event.target.value)}

              disabled={resourceLoading || !!resourceError}

              aria-label={t("crop")}

            >

              <option value="">{t("selectCrop")}</option>

              {recentCommodities.length ? (

                <optgroup label={t("recentCrops")}>

                  {recentCommodities.map((item) => (

                    <option key={`recent-${item.id}`} value={item.id}>

                      {item.label}

                    </option>

                  ))}

                </optgroup>

              ) : null}

              <optgroup label={recentCommodities.length ? t("allCrops") : t("crop")}>

                {otherCommodities.map((item) => (

                  <option key={item.id} value={item.id}>

                    {item.label}

                  </option>

                ))}

              </optgroup>

            </select>

            <ChevronDown size={17} />

          </span>

        </label>

        <label className="field">

          <span>{t("mandi")}</span>

          <MandiCombobox

            items={markets}

            value={market}

            onChange={onMarketChange}

            disabled={resourceLoading || !!resourceError}

            focusRequest={mandiFocusRequest}

            recentIds={recentMarketIds}

          />

        </label>

        {showHorizon ? (

          <label className="field">

            <span>{t("forecastDays")}</span>

            <span className="select-wrap">

              <CalendarDays size={18} />

              <select

                value={horizon}

                onChange={(event) => onHorizonChange(Number(event.target.value))}

                aria-label={t("forecastDays")}

              >

                {[1, 3, 7, 14].map((days) => (

                  <option key={days} value={days}>

                    {days} {t("days")}

                  </option>

                ))}

              </select>

              <ChevronDown size={17} />

            </span>

          </label>

        ) : null}

        <button

          className={`primary-button${hasSelection && validSelection ? " primary-button--ready" : ""}`}

          type="submit"

          disabled={!hasSelection || resourceLoading || forecastLoading}

        >

          <span>{forecastLoading ? t("checkingLiveMarket") : t("checkTodaysMarket")}</span>

          <ArrowRight size={18} />

        </button>

      </form>

    </>

  );

}



export function MarketSelectorForm({

  commodities,

  markets,

  commodity,

  market,

  horizon,

  popularCrops,

  recentCommodityIds,

  recentMarketIds,

  resourceLoading,

  resourceError,

  resourceUnavailable,

  forecastLoading,

  hasSelection,

  validSelection,

  compact,

  contextExpanded,

  mandiFocusRequest,

  onCommodityChange,

  onMarketChange,

  onHorizonChange,

  onPopularCropSelect,

  onToggleContextExpanded,

  onCheckAnotherCrop,

  onSubmit,

  onRetryResources,

}: MarketSelectorFormProps) {

  const { t } = useLanguage();



  if (compact) {

    return (

      <section className="market-context-bar" id="market-context-bar" aria-label={t("navMarket")}>

        <MarketFields

          commodities={commodities}

          markets={markets}

          commodity={commodity}

          market={market}

          horizon={horizon}

          popularCrops={popularCrops}

          recentCommodityIds={recentCommodityIds}

          recentMarketIds={recentMarketIds}

          resourceLoading={resourceLoading}

          resourceError={resourceError}

          forecastLoading={forecastLoading}

          hasSelection={hasSelection}

          validSelection={validSelection}

          showPopularCrops={contextExpanded}

          showHorizon={contextExpanded}

          mandiFocusRequest={mandiFocusRequest}

          onCommodityChange={onCommodityChange}

          onMarketChange={onMarketChange}

          onHorizonChange={onHorizonChange}

          onPopularCropSelect={onPopularCropSelect}

          onSubmit={onSubmit}

          formClassName={`market-form market-form--compact${contextExpanded ? " market-form--expanded" : ""}`}

        />

        <div className="market-context-actions">
          <button className="text-button market-context-reset" type="button" onClick={onCheckAnotherCrop}>
            <RotateCcw size={15} aria-hidden />
            {t("checkAnotherCrop")}
          </button>
          <button className="text-button market-context-toggle" type="button" onClick={onToggleContextExpanded} aria-expanded={contextExpanded}>
            {contextExpanded ? t("hideMarketOptions") : t("changeMarketSelection")}
          </button>
        </div>

        {resourceLoading ? <p className="form-note">{t("loadingChoices")}</p> : null}

        {resourceError ? (

          <StatePanel

            kind="error"

            title={resourceUnavailable ? t("liveServiceUnavailable") : t("couldNotLoadChoices")}

            message={resourceUnavailable ? t("liveChoicesUnavailable") : t("couldNotLoadChoicesMessage")}

            actionLabel={t("retry")}

            onAction={onRetryResources}

          />

        ) : null}

      </section>

    );

  }



  return (

    <section className="hero-section" aria-labelledby="hero-title">

      <div className="hero-copy">

        <p className="eyebrow">

          <Sparkles size={15} /> {t("liveMandiIntelligence")}

        </p>

        <h1 id="hero-title">{t("checkCropMarket")}</h1>

        <p>{t("chooseCropMandi")}</p>

      </div>

      <MarketFields

        commodities={commodities}

        markets={markets}

        commodity={commodity}

        market={market}

        horizon={horizon}

        popularCrops={popularCrops}

        recentCommodityIds={recentCommodityIds}

        recentMarketIds={recentMarketIds}

        resourceLoading={resourceLoading}

        resourceError={resourceError}

        forecastLoading={forecastLoading}

        hasSelection={hasSelection}

        validSelection={validSelection}

        showPopularCrops

        showHorizon

        mandiFocusRequest={mandiFocusRequest}

        onCommodityChange={onCommodityChange}

        onMarketChange={onMarketChange}

        onHorizonChange={onHorizonChange}

        onPopularCropSelect={onPopularCropSelect}

        onSubmit={onSubmit}

        formClassName="market-form"

      />

      {resourceLoading ? <p className="form-note">{t("loadingChoices")}</p> : null}

      {resourceError ? (

        <StatePanel

          kind="error"

          title={resourceUnavailable ? t("liveServiceUnavailable") : t("couldNotLoadChoices")}

          message={resourceUnavailable ? t("liveChoicesUnavailable") : t("couldNotLoadChoicesMessage")}

          actionLabel={t("retry")}

          onAction={onRetryResources}

        />

      ) : null}

    </section>

  );

}


