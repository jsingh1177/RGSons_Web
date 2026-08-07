package MJC.RGSons.controller;

import MJC.RGSons.dto.CategorySalesDTO;
import MJC.RGSons.dto.DayWiseSalesDTO;
import MJC.RGSons.dto.DistrictWiseDailySaleDTO;
import MJC.RGSons.dto.DsrStatusDTO;
import MJC.RGSons.dto.PriceSegmentExportRequestDTO;
import MJC.RGSons.dto.PriceSegmentReportDTO;
import MJC.RGSons.dto.StockTransferDetailRowDTO;
import MJC.RGSons.dto.StockTransferSummaryDTO;
import MJC.RGSons.dto.StoreSalesDTO;
import MJC.RGSons.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/sales/store-wise")
    public ResponseEntity<List<StoreSalesDTO>> getStoreWiseSales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<StoreSalesDTO> sales = reportService.getStoreWiseSales(startDate, endDate);
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/category-wise")
    public ResponseEntity<List<CategorySalesDTO>> getCategoryWiseSales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<CategorySalesDTO> sales = reportService.getCategoryWiseSales(startDate, endDate);
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/day-wise-total")
    public ResponseEntity<List<DayWiseSalesDTO>> getDayWiseTotalSales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName) {
        return ResponseEntity.ok(reportService.getDayWiseTotalSales(startDate, endDate, district, storeName));
    }

    @GetMapping("/sales/district-wise-daily")
    public ResponseEntity<List<DistrictWiseDailySaleDTO>> getDistrictWiseDailySales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        return ResponseEntity.ok(reportService.getDistrictWiseDailySales(startDate, endDate, district, storeName, partyName, saleLedger));
    }

    @GetMapping("/sales/dsr-status")
    public ResponseEntity<List<DsrStatusDTO>> getDsrStatus(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName) {
        return ResponseEntity.ok(reportService.getDsrStatus(startDate, endDate, district, storeName));
    }

    @GetMapping("/sales/sales-report-amount")
    public ResponseEntity<List<DsrStatusDTO>> getSalesReportAmount(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        return ResponseEntity.ok(reportService.getSalesReportAmount(startDate, endDate, district, storeName, partyName, saleLedger));
    }

    @GetMapping("/sales/other-sale")
    public ResponseEntity<List<DsrStatusDTO>> getOtherSale(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "storeCategory", required = false) String storeCategory,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        return ResponseEntity.ok(reportService.getOtherSale(startDate, endDate, district, storeName, storeCategory, partyName, saleLedger));
    }

    @GetMapping("/sales/price-segment")
    public ResponseEntity<List<PriceSegmentReportDTO>> getPriceSegmentReport(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "itemCodes", required = false) String itemCodes,
            @RequestParam(value = "sizeCode", required = false) String sizeCode
    ) {
        return ResponseEntity.ok(reportService.getPriceSegmentReport(startDate, endDate, district, storeName, itemCodes, sizeCode));
    }

    @GetMapping("/sales/dsr-vouchers")
    public ResponseEntity<List<String>> getDsrVouchers(
            @RequestParam("storeCode") String storeCode,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.getDsrVoucherNos(storeCode, date));
    }

    @GetMapping("/sales/dsr-status/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportDsrStatus(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportDsrStatusToExcel(startDate, endDate, district, storeName);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=dsr_status.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/sales/sales-report-amount/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportSalesReportAmount(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportSalesReportAmountToExcel(startDate, endDate, district, storeName, partyName, saleLedger);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=sales_report_amount.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/sales/other-sale/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportOtherSale(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "storeCategory", required = false) String storeCategory,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportOtherSaleToExcel(startDate, endDate, district, storeName, storeCategory, partyName, saleLedger);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=other_sale.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/sales/price-segment/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportPriceSegmentReport(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "itemCodes", required = false) String itemCodes,
            @RequestParam(value = "sizeCode", required = false) String sizeCode
    ) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportPriceSegmentReportToExcel(startDate, endDate, district, storeName, itemCodes, sizeCode);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=price_segment_report.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/sales/price-segment/export-view")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportPriceSegmentReportView(@RequestBody PriceSegmentExportRequestDTO request) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportPriceSegmentReportViewToExcel(request);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=price_segment_report_view.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/sales/district-wise-daily/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportDistrictWiseDailySales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "storeName", required = false) String storeName,
            @RequestParam(value = "partyName", required = false) String partyName,
            @RequestParam(value = "saleLedger", required = false) String saleLedger) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportDistrictWiseDailySalesToExcel(startDate, endDate, district, storeName, partyName, saleLedger);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=district_wise_daily_sale.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/transfers/stock-transfer-summary")
    public ResponseEntity<List<StockTransferSummaryDTO>> getStockTransferSummary(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "fromLocation", required = false) String fromLocation,
            @RequestParam(value = "toLocation", required = false) String toLocation,
            @RequestParam(value = "storeCode", required = false) String storeCode
    ) {
        return ResponseEntity.ok(reportService.getStockTransferSummary(startDate, endDate, district, fromLocation, toLocation, storeCode));
    }

    @GetMapping("/transfers/stock-transfer-summary/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportStockTransferSummary(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "fromLocation", required = false) String fromLocation,
            @RequestParam(value = "toLocation", required = false) String toLocation,
            @RequestParam(value = "storeCode", required = false) String storeCode
    ) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportStockTransferSummaryToExcel(startDate, endDate, district, fromLocation, toLocation, storeCode);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=stock_transfer_summary.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/transfers/stock-transfer-detail")
    public ResponseEntity<List<StockTransferDetailRowDTO>> getStockTransferDetail(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "fromLocation", required = false) String fromLocation,
            @RequestParam(value = "toLocation", required = false) String toLocation,
            @RequestParam(value = "storeCode", required = false) String storeCode
    ) {
        return ResponseEntity.ok(reportService.getStockTransferDetail(startDate, endDate, district, fromLocation, toLocation, storeCode));
    }

    @GetMapping("/transfers/stock-transfer-detail/export")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> exportStockTransferDetail(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "fromLocation", required = false) String fromLocation,
            @RequestParam(value = "toLocation", required = false) String toLocation,
            @RequestParam(value = "storeCode", required = false) String storeCode
    ) {
        try {
            java.io.ByteArrayInputStream in = reportService.exportStockTransferDetailToExcel(startDate, endDate, district, fromLocation, toLocation, storeCode);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=stock_transfer_detail.xlsx");
            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new org.springframework.core.io.InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
