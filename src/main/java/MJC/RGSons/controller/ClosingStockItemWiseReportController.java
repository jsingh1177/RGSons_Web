package MJC.RGSons.controller;

import MJC.RGSons.dto.ClosingStockItemWiseDTO;
import MJC.RGSons.service.ClosingStockItemWiseReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/reports/closing-stock-item-wise")
@CrossOrigin(origins = "*")
public class ClosingStockItemWiseReportController {

    @Autowired
    private ClosingStockItemWiseReportService service;

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts() {
        return ResponseEntity.ok(service.getDistricts());
    }

    @GetMapping
    public ResponseEntity<List<ClosingStockItemWiseDTO>> getReport(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(service.getReportData(district, storeCode, itemQuery, sizeCode, date));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemQuery,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String date) throws IOException {
        ByteArrayInputStream in = service.exportToExcel(district, storeCode, itemQuery, sizeCode, date);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=ClosingStockItemWiseReport.xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
