package MJC.RGSons.service;

import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.PurItem;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.PurItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PurchaseService {

    @Autowired
    private PurHeadRepository purHeadRepository;

    @Autowired
    private PurItemRepository purItemRepository;

    @Transactional
    public PurHead savePurchase(PurHead purHead, List<PurItem> purItems) {
        // Save the head
        PurHead savedHead = purHeadRepository.save(purHead);

        // Save items
        for (PurItem item : purItems) {
            item.setInvoiceNo(savedHead.getInvoiceNo()); // Ensure link
            purItemRepository.save(item);
        }

        return savedHead;
    }

    public List<PurHead> getAllPurchases() {
        return purHeadRepository.findAll();
    }
}
