import * as utils from "tns-core-modules/utils/utils";
import * as applicationModule from "tns-core-modules/application";
import { Observable, of as observableOf } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { HPRTPrinter} from "./hprt.common";
import {ImageSource, fromFile, fromResource, fromBase64} from "tns-core-modules/image-source";
import {Folder, path, knownFolders} from "tns-core-modules/file-system";


const BToperator: any = HPRTAndroidSDK.BTOperator;
// const HPRTPrinterHelper: any = HPRTAndroidSDK.HPRTPrinterHelper;
const PublicFunction: any = HPRTAndroidSDK.PublicFunction;
const HPRTPrinterHelper: any = HPRTAndroidSDK.HPRTPrinterHelper;
const REQUEST_ENABLE_BT = 1;
let onBluetoothEnabledResolve;

export class Hprt {

    private printer: any = null;
    private hpm: any;
    private hphc: any;
    private encoding: any;
    private printerModel: any;
    private HPRTPrinterHelper: any;
    private mBluetoothAdapter: any;

    constructor() {

        this.encoding = java.nio.charset.Charset.forName("UTF-8");
        this.HPRTPrinterHelper = new HPRTAndroidSDK.HPRTPrinterHelper(utils.ad.getApplicationContext(), "MPT-II");
        this.mBluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();

    }

    enableBluetooth(timeout?: number): Promise<any> {
        return new Promise((resolve, reject) => {

            let wait = timeout || 6000;

            if (this.mBluetoothAdapter == null) {
                reject("Bluetooth NOT support");
            } else {
                if (this.mBluetoothAdapter.isEnabled()) {
                    if (this.mBluetoothAdapter.isDiscovering()) {
                        resolve("Bluetooth is currently in device discovery process.");
                    } else {
                        resolve("Bluetooth is enabled");
                    }
                } else {
                    this.mBluetoothAdapter.enable();
                    setTimeout(() => {
                        if (!this.mBluetoothAdapter.isEnabled()) {
                            resolve();
                        }
                        else {
                            reject("Couldn't enable bluetooth, please do it manually.");
                        }
                    }, wait);
                }
            }
          });
    }

    isBluetoothEnabled(): boolean {
        return this.mBluetoothAdapter.isEnabled() && this.mBluetoothAdapter != null ? true : false;
    }

    isBluetoothEnabledPromise(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.mBluetoothAdapter.isEnabled() && this.mBluetoothAdapter != null) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }

    searchPrinters(): Promise<Array<HPRTPrinter>> {
        return new Promise((resolve, reject) => {
            let BluetoothDevice = android.bluetooth.BluetoothDevice;
            let mBtAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
            let pairedDevices = mBtAdapter.getBondedDevices();

            let printers: Array<HPRTPrinter> = [];

            if (pairedDevices.size() > 0) {

                let pairedDevicesArr = pairedDevices.toArray();

                for (let i = 0; i < pairedDevicesArr.length; i++) {

                    let device = "" + pairedDevicesArr[i]; // TODO: Figure out why this is not string
                    let deviceObj = mBtAdapter.getRemoteDevice(device);
                    printers.push(new HPRTPrinter(deviceObj.getAddress(), deviceObj.getName()));

                }
            }

            resolve(printers);

        });
    }

    connect(portSetting: HPRTPrinter): Promise<any> {
        return new Promise((resolve, reject) => {
            try {

                let isPortOpen = HPRTAndroidSDK.HPRTPrinterHelper.PortOpen("Bluetooth," + portSetting.portName);

                if (isPortOpen === -1) {
                    reject("No ports open");
                }
                else {
                    resolve();
                }
            } catch (e) {
              reject(e);
            }
        });
    }

    disconnect(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {

                HPRTAndroidSDK.HPRTPrinterHelper.PortClose();
                resolve();

            } catch (e) {
                reject(e);
            }
        });
    }

    isConnected(): boolean {
        return HPRTAndroidSDK.HPRTPrinterHelper.IsOpened();
    }

    // Print methods
    printTextSimple(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 0, 0); // Reset all to 0
        }
        return true;
    }

    FeedPaper(feed: number) {
        HPRTAndroidSDK.HPRTPrinterHelper.PrintAndFeed(feed);
        return true;
    }

    Cut() {
        HPRTAndroidSDK.HPRTPrinterHelper.PrintAndFeed(500);
        HPRTAndroidSDK.HPRTPrinterHelper.CutPaper(HPRTAndroidSDK.HPRTPrinterHelper.HPRT_PARTIAL_CUT);
        return true;
    }

    printText(text: string, alignment: number, attribute: number, textSize: number) {

        let align = alignment || 0;
        let attr = attribute || 0;
        let txtSize = textSize || 0;

        // let data = Array.create("byte", 1);
        // data[0] = "0x1b,0x40";
        // HPRTAndroidSDK.HPRTPrinterHelper.WriteData(data);

        // this.LanguageEncode();


        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, align, attr, txtSize);
        }

        return true;
    }

    printImage(FilePath: string, halftoneType: number, scaleMode: number, printdpi: number) {
        if (FilePath) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintImage(FilePath, halftoneType, scaleMode, printdpi);
        }
        return true;
    }

    printBinnaryFile(binaryFile: string) {
        HPRTAndroidSDK.HPRTPrinterHelper.PrintBinaryFile(binaryFile);
        return true;
    }

    printImageB64(image: string, halftoneType: number, scaleMode: number, printdpi: number) {
        let img: ImageSource;
        img = <ImageSource> fromBase64(image);
        const folderDest = knownFolders.documents();
        const pathDest = path.join(folderDest.path, "test.png");
        console.log(pathDest);
        const saved: boolean = img.saveToFile(pathDest, "png");
        if (saved) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintImage(pathDest, halftoneType, scaleMode, printdpi);
        }
        return saved;
    }

    printQRCode(text: string, QRCodeSize: number, QRCodeLevel: number, justification: string) {
        let justify: number;
        let level: number;
        if (justification === "L") {
            justify = 0;
        }
        if (justification === "C") {
            justify = 1;
        }
        if (justification === "R") {
            justify = 2;
        }
        level = QRCodeLevel;
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintQRCode(text, QRCodeSize + 1 , QRCodeLevel + 0x30 , justify);
            this.AfterPrintAction();
        }
        return true;
    }

    printTextDouble(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 48, 0);
        }
        return true;
    }

    printTextDoubleHeight(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 16, 0);
        }
        return true;
    }

    printTextDoubleWidth(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 32, 0);
        }
        return true;
    }

    printTextUnderline(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 4, 0);
        }
        return true;
    }

    printTextBold(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 2, 0);
        }
        return true;
    }

    printTextMini(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 1, 0);
        }
        return true;
    }

    printTextWhite(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 8, 0);
        }
        return true;
    }

    printTextLeft(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 0, 0, 0);
        }
        return true;
    }

    printTextCenter(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 1, 0, 0);
        }
        return true;
    }

    printTextRight(text: string) {
        if (text) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(text, 2, 0, 0);
        }
        return true;
    }

    newLine(lines?: number) {
        let line = lines || 1;

        for (let i = 0; i < line; i++) {
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText("\n");
        }
        return true;
    }

    horizontalLine() {
        let line = "--------------------------------";
        HPRTAndroidSDK.HPRTPrinterHelper.PrintText(line, 0, 0, 0);
        return true;
    }

    testPrint(): Promise<any> {
        return new Promise((resolve, reject) => {

            // Working
            // let data = this.toBytes("----NATIVESCRIPT--FUCK--YEAH----");
            // let bData = Array.create("byte", 3);
            // bData = data;
            // let print = this.printer.WriteData(bData, bData.length);

            // New
            let strPrintText = "Hello world";
            HPRTAndroidSDK.HPRTPrinterHelper.PrintText(strPrintText + "\n", 0, 0, 0);

            resolve();

        });
    }

    private toBytes(val) {
        return new java.lang.String(val).getBytes(this.encoding);
    }

    private LanguageEncode() {
        try {
            let PFun = new HPRTAndroidSDK.PublicFunction(utils.ad.getApplicationContext());
            let sLanguage = PFun.ReadSharedPreferencesData("Codepage").split(",")[1].toString();
            let sLEncode = "gb2312";
            let intLanguageNum = 0;

            sLEncode = PFun.getLanguageEncode(sLanguage);
            intLanguageNum = PFun.getCodePageIndex(sLanguage);

            HPRTAndroidSDK.HPRTPrinterHelper.SetCharacterSet(intLanguageNum);
            HPRTAndroidSDK.HPRTPrinterHelper.LanguageEncode = sLEncode;

            return sLEncode;
        }
        catch (e) {
            console.log("Error in LanguageEncode()");
            return "";
        }
    }

    private getEncodedString(val): any {

        let parts = val;
        // if it's not a string assume it's a byte array already
        if (typeof val === 'string') {
            parts = val.split(',');

            if (parts[0].indexOf('x') === -1) {
                return null;
            }
        }

        let result = Array.create("byte", parts.length);

        for (let i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result;

        // return new java.lang.String(value).getBytes(this.encoding);
    }

    private AfterPrintAction() {
        try {
            HPRTPrinterHelper.PrintAndFeed(PrinterProperty.TearSpacing);
        }
        catch (e) {
            console.log("AfterPrintAction", e);
        }
    }

    // Credits: https://www.nativescript.org/blog/controlling-robots-with-nativescript-bluetooth
    private listenToBluetoothEnabled(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            this.isBluetoothEnabledPromise().then(enabled => observer.next(enabled));

            let intervalHandle = setInterval(
                () => {
                    this.isBluetoothEnabledPromise()
                        .then(enabled => observer.next(enabled));
                }
                , 1000);

            // stop checking every second on unsubscribe
            return () => clearInterval(intervalHandle);
        })
        .pipe(distinctUntilChanged());
    }




}

export class PrinterProperty {
    public static Barcode: string = "";
    public static PrintableWidth: number = 0;
    public static Cut: boolean = false;
    public static CutSpacing: number = 0;
    public static TearSpacing: number = 0;
    public static ConnectType: number = 0;
    public static Cashdrawer: boolean = false;
    public static Buzzer: boolean = false;
    public static Pagemode: boolean = false;
    public static PagemodeArea: string = "";
    public static GetRemainingPower: boolean = false;
    public static SampleReceipt: boolean = true;
    public static StatusMode: number = 0;
}