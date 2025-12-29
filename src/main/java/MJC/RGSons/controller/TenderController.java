package MJC.RGSons.controller;

import MJC.RGSons.model.Tender;
import MJC.RGSons.service.TenderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tenders")
@CrossOrigin(origins = "*")
public class TenderController {

    @Autowired
    private TenderService tenderService;

    @GetMapping("/active")
    public ResponseEntity<List<Tender>> getActiveTenders() {
        return ResponseEntity.ok(tenderService.getActiveTenders());
    }
}
