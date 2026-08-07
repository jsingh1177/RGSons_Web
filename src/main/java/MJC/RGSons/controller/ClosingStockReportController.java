package MJC.RGSons.controller;

import MJC.RGSons.dto.ClosingStockDetailedReportDTO;
import MJC.RGSons.dto.ClosingStockReportDTO;
import MJC.RGSons.service.ClosingStockReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/reports/closing-stock")
@CrossOrigin(origins = "*")
public class ClosingStockReportController {

    @Autowired
    private ClosingStockReportService service;

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts() {
        return ResponseEntity.ok(service.getDistricts());
    }

    @GetMapping
    public ResponseEntity<List<ClosingStockReportDTO>> getReport(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeType,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(service.getReportData(district, storeType, storeCode, itemQuery, sizeCode, date));
    }

    @GetMapping("/detailed")
    public ResponseEntity<ClosingStockDetailedReportDTO> getDetailedReport(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeType,
            @RequestParam String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(service.getDetailedReportData(district, storeType, storeCode, itemQuery, sizeCode, date));
    }

    @GetMapping("/columns")
    public ResponseEntity<List<String>> getColumns(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeType,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(service.getDynamicColumns(district, storeType, storeCode, itemQuery, sizeCode, date));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeType,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String expandedDistricts) throws IOException {
        
        ByteArrayInputStream in = service.exportToExcel(district, storeType, storeCode, itemQuery, sizeCode, date, expandedDistricts);
        
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=ClosingStockReport.xlsx");
        
        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
