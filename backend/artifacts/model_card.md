# VesselVision model card

Intended use: decision support / education for CAD + LAD/LCX/RCA stenosis screening from routine clinical data. Not a diagnostic device.

Data: Z-Alizadeh Sani extension (UCI 411, CC BY 4.0), n=303. Leakage columns (LAD/LCX/RCA/Cath/CAD) never used as features.

## Held-out metrics (stratified 20% test, seed 42)

- CAD (logreg_smote, sigmoid calibration, threshold 0.4): acc 0.8689, prec 0.8571, rec 0.9767, F1 0.913, AUC 0.8889, Brier 0.1173 (n_test=61, pos_rate=0.7049)
- LAD (rf_smote, sigmoid calibration, threshold 0.45): acc 0.8197, prec 0.7907, rec 0.9444, F1 0.8608, AUC 0.8378, Brier 0.1583 (n_test=61, pos_rate=0.5902)
- LCX (xgb, isotonic calibration, threshold 0.2): acc 0.623, prec 0.5116, rec 0.9167, F1 0.6567, AUC 0.737, Brier 0.2065 (n_test=61, pos_rate=0.3934)
- RCA (lgbm, uncalibrated calibration, threshold 0.17): acc 0.541, prec 0.4444, rec 0.8696, F1 0.5882, AUC 0.7517, Brier 0.1934 (n_test=61, pos_rate=0.377)

## Limitations

n=303 single-center; wide confidence intervals; referral-population bias; no external validation; schematic 3D arteries, not patient anatomy; screening signal, not diagnosis.
