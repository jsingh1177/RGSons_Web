package MJC.RGSons.controller;

import MJC.RGSons.dto.StockLedgerEntryDTO;
import MJC.RGSons.service.StockLedgerReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/stock-ledger")
@CrossOrigin(origins = "*")
public class StockLedgerReportController {

    @Autowired
    private StockLedgerReportService stockLedgerReportService;

    @GetMapping("/items")
    public ResponseEntity<List<Map<String, String>>> getItems(
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String categoryCode
    ) {
        return ResponseEntity.ok(stockLedgerReportService.getStockItems(storeCode, categoryCode));
    }

    @GetMapping
    public ResponseEntity<List<StockLedgerEntryDTO>> getStockLedger(
            @RequestParam(required = false) String storeCode,
            @RequestParam String itemCode,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String asOnDate
    ) {
        return ResponseEntity.ok(stockLedgerReportService.getStockLedger(storeCode, itemCode, sizeCode, asOnDate));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String storeCode,
            @RequestParam String itemCode,
            @RequestParam(required = false) String sizeCode,
            @RequestParam(required = false) String asOnDate
    ) {
        byte[] data = stockLedgerReportService.exportStockLedgerToExcel(storeCode, itemCode, sizeCode, asOnDate);
        String suffix = (asOnDate != null && !asOnDate.isBlank()) ? asOnDate : LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String fileName = "StockLedger_" + suffix + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
