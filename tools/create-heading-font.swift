import Foundation
import CoreText
import CoreGraphics

// Keep the full source font outside public: the site loads only these outlines and the accompanying OFL.
guard CommandLine.arguments.count == 2 else {
    fatalError("Usage: swift tools/create-heading-font.swift /path/to/NotoSansJP-Bold.otf")
}
let source = URL(fileURLWithPath: CommandLine.arguments[1])
guard let provider = CGDataProvider(url: source as CFURL), let graphicsFont = CGFont(provider) else {
    fatalError("Cannot read the source font")
}
let font = CTFontCreateWithGraphicsFont(graphicsFont, 1000, nil, nil)
let family = CTFontCopyFamilyName(font) as String
guard family == "Noto Sans JP" else {
    fatalError("Expected Noto Sans JP, received \(family)")
}
let style = CTFontCopyName(font, kCTFontSubFamilyNameKey) as String? ?? ""
let copyright = CTFontCopyName(font, kCTFontCopyrightNameKey) as String? ?? ""
let version = CTFontCopyName(font, kCTFontVersionNameKey) as String? ?? ""
let number: (CGFloat) -> String = { String(Int($0.rounded())) }
var glyphs: [String: Any] = [:]

for character in Set("ProfileCareerWorksLinksYuki EndoPortfolioFrontend Engineer ?").sorted() {
    guard var code = String(character).utf16.first else { continue }
    var glyph: CGGlyph = 0
    guard CTFontGetGlyphsForCharacters(font, &code, &glyph, 1) else {
        fatalError("Missing glyph: \(character)")
    }
    var advance = CGSize.zero
    CTFontGetAdvancesForGlyphs(font, .horizontal, &glyph, &advance, 1)
    let path = CTFontCreatePathForGlyph(font, glyph, nil)
    var outline: [String] = []
    var start = CGPoint.zero
    path?.applyWithBlock { element in
        let points = element.pointee.points
        switch element.pointee.type {
        case .moveToPoint:
            start = points[0]
            outline += ["m", number(start.x), number(start.y)]
        case .addLineToPoint:
            outline += ["l", number(points[0].x), number(points[0].y)]
        case .addQuadCurveToPoint:
            outline += ["q", number(points[1].x), number(points[1].y), number(points[0].x), number(points[0].y)]
        case .addCurveToPoint:
            outline += ["b", number(points[2].x), number(points[2].y), number(points[0].x), number(points[0].y), number(points[1].x), number(points[1].y)]
        case .closeSubpath:
            outline += ["l", number(start.x), number(start.y)]
        @unknown default:
            fatalError("Unsupported outline element")
        }
    }
    let bounds = path?.boundingBoxOfPath ?? .zero
    glyphs[String(character)] = [
        "ha": advance.width,
        "x_min": bounds.minX,
        "x_max": bounds.maxX,
        "o": outline.joined(separator: " ")
    ]
}

let bounds = CTFontGetBoundingBox(font)
let data: [String: Any] = [
    "glyphs": glyphs,
    "familyName": "Portfolio Noto Display",
    "ascender": CTFontGetAscent(font),
    "descender": -CTFontGetDescent(font),
    "underlinePosition": CTFontGetUnderlinePosition(font),
    "underlineThickness": CTFontGetUnderlineThickness(font),
    "boundingBox": ["xMin": bounds.minX, "xMax": bounds.maxX, "yMin": bounds.minY, "yMax": bounds.maxY],
    "resolution": 1000,
    "original_font_information": [
        "family": family,
        "style": style,
        "version": version,
        "copyright": copyright,
        "license": "SIL Open Font License 1.1; see OFL.txt",
        "source": "https://github.com/notofonts/noto-cjk"
    ]
]
let output = URL(fileURLWithPath: "public/assets/font/noto-sans-jp/journey.typeface.json")
try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
try JSONSerialization.data(withJSONObject: data, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]).write(to: output)
print("Wrote \(glyphs.count) \(family) \(style) glyphs to \(output.path)")
