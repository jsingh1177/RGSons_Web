package MJC.RGSons.controller;

import MJC.RGSons.dto.InventoryReplenishmentResponseDTO;
import MJC.RGSons.service.InventoryReplenishmentReportService;
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

@RestController
@RequestMapping("/api/reports/inventory-replenishment")
@CrossOrigin(origins = "*")
public class InventoryReplenishmentReportController {

    @Autowired
    private InventoryReplenishmentReportService service;

    @GetMapping
    public ResponseEntity<InventoryReplenishmentResponseDTO> getReport(
            @RequestParam String fromDate,
            @RequestParam String toDate,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemCodes,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) Integer forecastDays,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "100") Integer size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir
    ) {
        return ResponseEntity.ok(service.getReport(
                fromDate,
                toDate,
                district,
                storeCode,
                itemCodes,
                sizeCode,
                forecastDays,
                page,
                size,
                sortBy,
                sortDir
        ));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @RequestParam String fromDate,
            @RequestParam String toDate,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String itemCodes,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) Integer forecastDays,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir
    ) throws IOException {
        ByteArrayInputStream in = service.exportToExcel(
                fromDate,
                toDate,
                district,
                storeCode,
                itemCodes,
                sizeCode,
                forecastDays,
                sortBy,
                sortDir
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=InventoryReplenishmentReport.xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
