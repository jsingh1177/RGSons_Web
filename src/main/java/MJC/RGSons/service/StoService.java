package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.StoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StoService {

    @Autowired
    private StoHeadRepository stoHeadRepository;

    @Autowired
    private StoItemRepository stoItemRepository;

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private DSRService dsrService;

    @Autowired
    private VoucherService voucherService;

    @Transactional
    public StoHead saveStockTransfer(StoHead stoHead, List<StoItem> stoItems) {
        // Ensure valid STO number
        if (stoHead.getStoNumber() == null || stoHead.getStoNumber().trim().isEmpty() || "New".equalsIgnoreCase(stoHead.getStoNumber())) {
             String newStoNumber = generateStoNumber(stoHead.getFromStore());
             stoHead.setStoNumber(newStoNumber);
        }

        // Save the head
        StoHead savedHead = stoHeadRepository.save(stoHead);

        // Save items
        for (StoItem item : stoItems) {
            item.setStoNumber(savedHead.getStoNumber()); // Ensure link
            stoItemRepository.save(item);

            // Update Inventory (Outward from Source Store)
            updateInventoryOutward(item);
        }

        // Update DSR (Sync STO quantities to DSR Outward)
        try {
            System.out.println("Updating DSR after STO Save: " + stoHead.getFromStore() + ", " + stoHead.getDate());
            dsrService.populateDSR(stoHead.getFromStore(), stoHead.getDate(), stoHead.getUserName());
        } catch (Exception e) {
            System.err.println("Error updating DSR from STO: " + e.getMessage());
            e.printStackTrace();
        }

        return savedHead;
    }

    private void updateInventoryOutward(StoItem item) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                item.getFromStore(), item.getItemCode(), item.getSizeCode());

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentOutward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setOutward(currentOutward + item.getQuantity());

            // Recalculate Closing: Closing = Opening + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int inward = inv.getInward() != null ? inv.getInward() : 0;
            int outward = inv.getOutward();
            inv.setClosing(opening + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            // Create new inventory record if not exists (though unusual for outward)
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(item.getFromStore());
            inv.setItemCode(item.getItemCode());
            inv.setItemName(item.getItemName());
            inv.setSizeCode(item.getSizeCode());
            inv.setSizeName(item.getSizeName());
            inv.setOpening(0);
            inv.setInward(0);
            inv.setOutward(item.getQuantity());
            inv.setClosing(-item.getQuantity()); // Negative stock
            inventoryMasterRepository.save(inv);
        }
    }

    public List<StoHead> getAllStockTransfers() {
        return stoHeadRepository.findAll();
    }

    public String generateStoNumber(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("STOCK_TRANSFER_OUT", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating STO voucher number: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic
            Long max = stoHeadRepository.findMaxStoNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }
}
