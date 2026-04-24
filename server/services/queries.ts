import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE
} from "../config/pricing.js";

export const metadataQuery = `
  SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT SITE_NO) AS total_sites,
    MIN(date(DP_DATE)) AS min_dp_date,
    MAX(date(DP_DATE)) AS max_dp_date
  FROM pricing_records
`;

const analyticsCte = `
WITH baseline AS (
  SELECT
    SITE_NO AS siteNo,
    MAX(SITE_NAME) AS siteName,
    MAX(DIVISION_NAME) AS divisionName,
    MAX(FC_NAME) AS fcName,
    MAX(SECT_NAME) AS sectName,
    MAX(SEGMENT) AS segment,
    MAX(CHANNEL) AS channel,
    SUM(NP_AVG * SUMQ) / NULLIF(SUM(SUMQ), 0) AS baselineNetPrice,
    SUM(SUMQ) AS baselineVolume
  FROM pricing_records
  WHERE date(DP_DATE) BETWEEN '${BASELINE_START}' AND '${BASELINE_END}'
  GROUP BY SITE_NO
),
post_daily AS (
  SELECT
    SITE_NO AS siteNo,
    date(DP_DATE) AS day,
    MAX(SITE_NAME) AS siteName,
    SUM(NP_AVG * SUMQ) / NULLIF(SUM(SUMQ), 0) AS postNetPrice,
    SUM(SUMQ) AS postVolume
  FROM pricing_records
  WHERE date(DP_DATE) >= '${CAMPAIGN_START}'
  GROUP BY SITE_NO, date(DP_DATE)
),
post_vs_baseline AS (
  SELECT
    p.siteNo,
    p.siteName,
    p.day,
    p.postNetPrice,
    p.postVolume,
    b.divisionName,
    b.fcName,
    b.sectName,
    b.segment,
    b.channel,
    b.baselineNetPrice,
    b.baselineVolume,
    CASE
      WHEN (p.postNetPrice - b.baselineNetPrice) > 0
      THEN (p.postNetPrice - b.baselineNetPrice)
      ELSE 0
    END AS increaseAmount,
    (
      CASE
        WHEN (p.postNetPrice - b.baselineNetPrice) > 0
        THEN (p.postNetPrice - b.baselineNetPrice)
        ELSE 0
      END / ${TARGET_INCREASE}
    ) * 100.0 AS targetPercent,
    CASE
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 500 THEN '500+'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 400 THEN '400-499'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 300 THEN '300-399'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 250 THEN '250-299'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 200 THEN '200-249'
      WHEN (p.postNetPrice - b.baselineNetPrice) >= 100 THEN '100-199'
      ELSE '0-99'
    END AS ladder
  FROM post_daily p
  INNER JOIN baseline b ON b.siteNo = p.siteNo
  WHERE b.baselineNetPrice IS NOT NULL
    AND p.postNetPrice IS NOT NULL
),
latest_day AS (
  SELECT siteNo, MAX(day) AS latestDay
  FROM post_vs_baseline
  GROUP BY siteNo
),
latest_status AS (
  SELECT pvb.*
  FROM post_vs_baseline pvb
  INNER JOIN latest_day ld
    ON ld.siteNo = pvb.siteNo
   AND ld.latestDay = pvb.day
)
`;

export const summaryQuery = `
${analyticsCte}
SELECT
  COUNT(*) AS comparableSites,
  SUM(CASE WHEN ladder = '500+' THEN 1 ELSE 0 END) AS ladder500,
  SUM(CASE WHEN ladder = '400-499' THEN 1 ELSE 0 END) AS ladder400,
  SUM(CASE WHEN ladder = '300-399' THEN 1 ELSE 0 END) AS ladder300,
  SUM(CASE WHEN ladder = '250-299' THEN 1 ELSE 0 END) AS ladder250,
  SUM(CASE WHEN ladder = '200-249' THEN 1 ELSE 0 END) AS ladder200,
  SUM(CASE WHEN ladder = '100-199' THEN 1 ELSE 0 END) AS ladder100,
  SUM(CASE WHEN ladder = '0-99' THEN 1 ELSE 0 END) AS ladder0,
  SUM(CASE WHEN increaseAmount < 300 THEN 1 ELSE 0 END) AS belowTargetSites,
  ROUND(SUM(increaseAmount), 2) AS totalIncrease,
  ROUND(SUM(increaseAmount * postVolume) / NULLIF(SUM(postVolume), 0), 2) AS avgIncrease,
  ROUND(AVG(targetPercent), 2) AS avgTargetPercent,
  ROUND(
    (
      SUM(CASE WHEN increaseAmount >= ${TARGET_INCREASE} THEN 1 ELSE 0 END) * 100.0
    ) / NULLIF(COUNT(*), 0),
    2
  ) AS targetHitShare,
  ROUND(MIN(increaseAmount), 2) AS minIncrease,
  ROUND(MAX(increaseAmount), 2) AS maxIncrease,
  MIN(day) AS latestDayMin,
  MAX(day) AS latestDayMax
FROM latest_status
`;

export const trendQuery = `
${analyticsCte}
,
movement_base AS (
  SELECT
    siteNo,
    day,
    ladder,
    CASE ladder
      WHEN '0-99' THEN 1
      WHEN '100-199' THEN 2
      WHEN '200-249' THEN 3
      WHEN '250-299' THEN 4
      WHEN '300-399' THEN 5
      WHEN '400-499' THEN 6
      WHEN '500+' THEN 7
    END AS ladderRank,
    LAG(
      CASE ladder
        WHEN '0-99' THEN 1
        WHEN '100-199' THEN 2
        WHEN '200-249' THEN 3
        WHEN '250-299' THEN 4
        WHEN '300-399' THEN 5
        WHEN '400-499' THEN 6
        WHEN '500+' THEN 7
      END
    ) OVER (PARTITION BY siteNo ORDER BY day) AS previousLadderRank
  FROM post_vs_baseline
)
SELECT
  pvb.day,
  COUNT(*) AS siteCount,
  SUM(CASE WHEN pvb.ladder = '500+' THEN 1 ELSE 0 END) AS ladder500,
  SUM(CASE WHEN pvb.ladder = '400-499' THEN 1 ELSE 0 END) AS ladder400,
  SUM(CASE WHEN pvb.ladder = '300-399' THEN 1 ELSE 0 END) AS ladder300,
  SUM(CASE WHEN pvb.ladder = '250-299' THEN 1 ELSE 0 END) AS ladder250,
  SUM(CASE WHEN pvb.ladder = '200-249' THEN 1 ELSE 0 END) AS ladder200,
  SUM(CASE WHEN pvb.ladder = '100-199' THEN 1 ELSE 0 END) AS ladder100,
  SUM(CASE WHEN pvb.ladder = '0-99' THEN 1 ELSE 0 END) AS ladder0,
  ROUND(SUM(pvb.increaseAmount * pvb.postVolume) / NULLIF(SUM(pvb.postVolume), 0), 2) AS avgIncrease,
  ROUND(AVG(pvb.targetPercent), 2) AS avgTargetPercent,
  SUM(
    CASE
      WHEN mb.ladder = '500+'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto500,
  SUM(
    CASE
      WHEN mb.ladder = '400-499'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto400,
  SUM(
    CASE
      WHEN mb.ladder = '300-399'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto300,
  SUM(
    CASE
      WHEN mb.ladder = '250-299'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto250,
  SUM(
    CASE
      WHEN mb.ladder = '200-249'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto200,
  SUM(
    CASE
      WHEN mb.ladder = '100-199'
       AND (mb.previousLadderRank IS NULL OR mb.ladderRank > mb.previousLadderRank)
      THEN 1 ELSE 0
    END
  ) AS moveInto100,
  SUM(
    CASE
      WHEN mb.ladder = '0-99'
       AND mb.previousLadderRank IS NULL
      THEN 1 ELSE 0
    END
  ) AS moveInto0
FROM post_vs_baseline pvb
INNER JOIN movement_base mb
  ON mb.siteNo = pvb.siteNo
 AND mb.day = pvb.day
GROUP BY pvb.day
ORDER BY pvb.day
`;

export const projectStatusQuery = `
${analyticsCte}
SELECT
  siteNo,
  siteName,
  divisionName,
  fcName,
  sectName,
  segment,
  channel,
  latest_status.day AS latestDay,
  ROUND(baselineNetPrice, 2) AS baselineNetPrice,
  ROUND(postNetPrice, 2) AS currentNetPrice,
  ROUND(increaseAmount, 2) AS increaseAmount,
  ROUND(targetPercent, 2) AS targetPercent,
  ladder,
  baselineVolume,
  postVolume
FROM latest_status
ORDER BY increaseAmount ASC, siteName ASC
`;

export const projectTrendQuery = `
${analyticsCte}
SELECT
  siteNo,
  siteName,
  day,
  ROUND(baselineNetPrice, 2) AS baselineNetPrice,
  ROUND(postNetPrice, 2) AS postNetPrice,
  ROUND(increaseAmount, 2) AS increaseAmount,
  ROUND(targetPercent, 2) AS targetPercent,
  ladder
FROM post_vs_baseline
WHERE siteNo = ?
ORDER BY day
`;
