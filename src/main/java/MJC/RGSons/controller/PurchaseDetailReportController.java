package MJC.RGSons.controller;

import MJC.RGSons.dto.ItemPartyPurchaseDTO;
import MJC.RGSons.service.PurchaseDetailReportService;
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
@RequestMapping("/api/reports/purchase-detail")
@CrossOrigin(origins = "*")
public class PurchaseDetailReportController {

    @Autowired
    private PurchaseDetailReportService service;

    @GetMapping
    public ResponseEntity<List<ItemPartyPurchaseDTO>> getReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String partyCode) {
        return ResponseEntity.ok(service.getReport(startDate, endDate, categoryCode, partyCode));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> export(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String partyCode) throws IOException {
        ByteArrayInputStream in = service.exportToExcel(startDate, endDate, categoryCode, partyCode);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=ItemWisePartyWisePurchase.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}

