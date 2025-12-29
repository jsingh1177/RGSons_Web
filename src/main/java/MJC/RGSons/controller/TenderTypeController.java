package MJC.RGSons.controller;

import MJC.RGSons.model.TenderType;
import MJC.RGSons.service.TenderTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tender-types")
@CrossOrigin(origins = "*")
public class TenderTypeController {

    @Autowired
    private TenderTypeService tenderTypeService;

    @GetMapping
    public ResponseEntity<List<TenderType>> getAllTenderTypes() {
        return ResponseEntity.ok(tenderTypeService.getAllTenderTypes());
    }

    @GetMapping("/active")
    public ResponseEntity<List<TenderType>> getActiveTenderTypes() {
        return ResponseEntity.ok(tenderTypeService.getActiveTenderTypes());
    }
}
