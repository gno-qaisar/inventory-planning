# Panda Planner — Inventory Forecasting Dataset

Seller: Panda Planner LLC · Marketplace: Amazon.com (US) · Exported: 2026-10-30

Companion dataset for the Inventory Forecasting trial task. The
`Inventory Planning.xlsx` workbook is the spec and worked example; these CSVs
are the realistic-scale data to run the engine on.

## monthly-sales-by-asin.csv

Monthly sales per (ASIN, SKU), September 2025 through October 2026
(October 2026 is a partial month, data through Oct 29). Replaces the
workbook's `SellerBoard data` sheet.

| Column | Meaning |
|---|---|
| month | Calendar month (YYYY-MM) |
| asin / sku / parent_asin | Product identifiers; one row per ASIN+SKU+month |
| units_ordered | Units ordered that month — use this as "units sold" in formula #1 |
| ordered_product_sales | Ordered revenue (USD) — with units_ordered, gives selling price for formula #6 |
| net_units_sold / net_product_sales | Net of refunds; alternative basis if you prefer |

Note: history starts 2025-07-22, so "same month last year" only exists from
August 2026 forward. For forecast months whose last-year month predates the
data, treat the ASIN like a new product (manual starting number input).

## current-inventory.csv

Current stock per SKU (63 rows, synced 2026-10-29). Replaces the workbook's
`Sellerboard Inventory` sheet. Inputs for formula #2.

| Column | Meaning |
|---|---|
| asin / sku / title / marketplace | Product identifiers |
| velocity | Current daily sales velocity (units/day) |
| fbaActive | Fulfillable units in Amazon FBA |
| fbaReserved | Reserved units (being processed/transferred by Amazon) |
| fbaInbound | Units in shipments on the way to Amazon |
| awdTotal | Units in Amazon's upstream AWD warehouses |
| warehouse | Units in the seller's own warehouse |
| fbaFull | fbaActive + fbaReserved + fbaInbound (precomputed) |

Starting stock for month 0 = fbaActive + fbaReserved + fbaInbound + awdTotal +
warehouse, plus the user-entered in-production and 3PL units.

## Join notes

- Join the two files on `sku` (or `asin`; a few ASINs have multiple SKUs).
- Products in the sales file but not the inventory file are out of stock or
  delisted; products in inventory with no sales history are new ASINs.
