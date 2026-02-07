package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.StiHead;
import MJC.RGSons.model.StiItem;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.StiHeadRepository;
import MJC.RGSons.repository.StiItemRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.StoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StiService {

    @Autowired
    private StiHeadRepository stiHeadRepository;

    @Autowired
    private StiItemRepository stiItemRepository;

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
    public StiHead saveStockTransferIn(StiHead stiHead, List<StiItem> stiItems) {
        // Always generate a fresh voucher number on save to ensure sequence integrity
        // This overrides any preview number sent from frontend
        String newStiNumber = generateStiNumberForSave(stiHead.getToStore());
        stiHead.setStiNumber(newStiNumber);

        StiHead savedHead = stiHeadRepository.save(stiHead);
        
        for (StiItem item : stiItems) {
            item.setStiNumber(savedHead.getStiNumber());
            stiItemRepository.save(item);
            
            // Update Inventory (Inward to Receiving Store)
            updateInventoryInward(item);
        }
        
        // Update STO Status to RECEIVED
        List<StoHead> stoHeads = stoHeadRepository.findByStoNumber(stiHead.getStoNumber());
        if (!stoHeads.isEmpty()) {
            StoHead stoHead = stoHeads.get(0);
            stoHead.setReceivedStatus("RECEIVED");
            stoHead.setReceivedBy(stiHead.getUserName());
            stoHeadRepository.save(stoHead);
        }

        // Update DSR (Sync STI quantities to DSR Inward)
        try {
            System.out.println("Updating DSR after STI Save: " + stiHead.getToStore() + ", " + stiHead.getDate());
            dsrService.populateDSR(stiHead.getToStore(), stiHead.getDate(), stiHead.getUserName());
        } catch (Exception e) {
            System.err.println("Error updating DSR from STI: " + e.getMessage());
            e.printStackTrace();
            // Don't fail the transaction just because DSR update failed, or do?
            // Usually DSR is secondary, so logging is enough.
        }

        return savedHead;
    }

    private void updateInventoryInward(StiItem item) {
        Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                item.getToStore(), item.getItemCode(), item.getSizeCode());

        if (invOpt.isPresent()) {
            InventoryMaster inv = invOpt.get();
            int currentInward = inv.getInward() != null ? inv.getInward() : 0;
            inv.setInward(currentInward + item.getQuantity());

            // Recalculate Closing: Closing = Opening + Inward - Outward
            int opening = inv.getOpening() != null ? inv.getOpening() : 0;
            int inward = inv.getInward();
            int outward = inv.getOutward() != null ? inv.getOutward() : 0;
            inv.setClosing(opening + inward - outward);

            inventoryMasterRepository.save(inv);
        } else {
            // Create new inventory record if not exists
            InventoryMaster inv = new InventoryMaster();
            inv.setStoreCode(item.getToStore());
            inv.setItemCode(item.getItemCode());
            inv.setItemName(item.getItemName());
            inv.setSizeCode(item.getSizeCode());
            inv.setSizeName(item.getSizeName());
            inv.setOpening(0);
            inv.setInward(item.getQuantity());
            inv.setOutward(0);
            inv.setClosing(item.getQuantity());
            inventoryMasterRepository.save(inv);
        }
    }

    public List<StoHead> getPendingStos(String toStore, String businessDate) {
        if (businessDate != null && !businessDate.isEmpty()) {
            return stoHeadRepository.findPendingStosByDate(toStore, "PENDING", businessDate);
        }
        return stoHeadRepository.findByToStoreAndReceivedStatus(toStore, "PENDING");
    }

    public List<StoItem> getStoItems(String stoNumber) {
        return stoItemRepository.findByStoNumber(stoNumber);
    }

    public String generateStiNumber(String storeCode) {
        try {
            // "STOCK_TRANSFER_IN" is the voucher type code for Stock Transfer In
            return voucherService.getProvisionalVoucherNumber("STOCK_TRANSFER_IN", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating STI voucher preview: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic
            Long max = stiHeadRepository.findMaxStiNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }

    public String generateStiNumberForSave(String storeCode) {
        try {
            return voucherService.generateVoucherNumber("STOCK_TRANSFER_IN", storeCode);
        } catch (Exception e) {
            System.err.println("Error generating STI voucher number: " + e.getMessage());
            e.printStackTrace();
            // Fallback to legacy logic
            Long max = stiHeadRepository.findMaxStiNumber();
            long next = (max == null) ? 1 : max + 1;
            return String.valueOf(next);
        }
    }
}
