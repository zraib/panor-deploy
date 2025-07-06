# Panorama Viewer Application

A modern, interactive panorama viewer built with Next.js and Marzipano, designed for immersive 360°
panoramic experiences with seamless navigation between connected scenes.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd pano-app

# Install dependencies
npm install

# Install Python dependencies
pip install numpy

# Generate panorama configuration
npm run generate-config

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📋 Prerequisites

- **Node.js** 18.x or later
- **Python** 3.8 or later
- **NumPy** for Python (for configuration generation)

### Platform-Specific Setup

#### Windows

```bash
# Install Python from python.org or Microsoft Store
python -m pip install numpy
```

#### macOS

```bash
# Using Homebrew
brew install python
python3 -m pip install numpy
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip
python3 -m pip install numpy
```

## 🛠️ Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run dev:config` - Generate config and start dev server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Configuration

- `npm run generate-config` - Generate panorama configuration from CSV data
- `npm run test:config` - Test configuration generation

### Testing

- `npm run test` - Run JavaScript/TypeScript tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:python` - Run Python configuration tests
- `npm run test:all` - Run all tests (JS + Python)

### Code Quality

- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Utilities

- `npm run clean` - Clean build artifacts and generated files
- `npm run cleanup-temp` - Remove accumulated temporary files from uploads

## 📁 Project Structure

```
pano-app/
├── .github/workflows/     # GitHub Actions CI/CD
├── docs/                  # Documentation
│   ├── README.md         # Setup instructions
│   ├── CONFIGURATION.md  # Configuration guide
│   └── TROUBLESHOOTING.md # Troubleshooting guide
├── public/               # Static assets
│   ├── assets/js/        # Marzipano library
│   ├── data/             # CSV data files
│   ├── images/           # Panorama images
│   └── config.json       # Generated configuration
├── scripts/              # Build and utility scripts
│   └── generate_marzipano_config.py
├── src/                  # Source code
│   ├── components/       # React components
│   ├── lib/             # Utility libraries
│   ├── pages/           # Next.js pages
│   └── types/           # TypeScript definitions
├── tests/               # Test files
└── package.json         # Dependencies and scripts
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# Panorama Configuration
PANORAMA_CONFIG_MODE=standard
PANORAMA_YAW_OFFSET=0
PANORAMA_PITCH_OFFSET=0
PANORAMA_CAMERA_OFFSET=1.2
PANORAMA_MAX_DISTANCE=10.0
PANORAMA_MAX_CONNECTIONS=6

# Development Settings
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_SHOW_DEBUG_INFO=false
```

### Data Format

Place your panorama data in `public/data/pano-poses.csv`:

```csv
id,x,y,z,qw,qx,qy,qz
pano1,0,0,0,1,0,0,0
pano2,5,0,0,1,0,0,0
```

- `id`: Unique panorama identifier
- `x,y,z`: World coordinates
- `qw,qx,qy,qz`: Quaternion orientation

## 🔧 Development Workflow

1. **Setup**: Install dependencies and configure environment
2. **Data**: Add panorama images to `public/images/`
3. **Configuration**: Update `public/data/pano-poses.csv`
4. **Generate**: Run `npm run generate-config`
5. **Develop**: Start with `npm run dev`
6. **Test**: Run `npm run test:all`
7. **Build**: Create production build with `npm run build`

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Jest + Testing Library for React components
- **Integration Tests**: Configuration generation and API endpoints
- **Python Tests**: Pytest for configuration script validation
- **E2E Tests**: Lighthouse CI for performance testing

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test              # JavaScript/TypeScript tests
npm run test:python       # Python configuration tests
npm run test:coverage     # With coverage report
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build for production
npm run generate-config
npm run build

# Export static files (optional)
npm run export
```

## 🔍 Performance Optimization

The application now includes intelligent performance optimizations that automatically adapt based on dataset size:

### Automatic Optimizations

- **Smart Scene Loading**: Progressive quality based on total scene count
  - 4-50 scenes: Full quality (4096px max resolution)
  - 51-100 scenes: Balanced quality (3072px max resolution)
  - 101-200 scenes: Optimized quality (2048px max resolution)
  - 200+ scenes: Ultra-light quality (2048px max resolution)

- **Distance-Based Prioritization**: Scenes are loaded/unloaded based on spatial proximity
- **Memory Management**: Automatic unloading of distant scenes to prevent memory overflow
- **Adaptive Preloading**: Intelligent preloading limits based on dataset size
- **Staggered Loading**: Prevents system overwhelming with delayed scene loading

### Performance Monitor

A real-time performance monitor is available in the top-right corner showing:
- Number of loaded scenes vs total scenes
- Estimated memory usage
- Average loading times
- Performance status (Excellent/Good/Fair/Poor)
- Manual optimization button

### Manual Optimizations

- **Image Optimization**: Use WebP format for panorama images
- **Lazy Loading**: Implemented automatically for large datasets
- **Caching**: Configure appropriate cache headers
- **Bundle Analysis**: Use `npm run build` to analyze bundle size

### Performance Tips

- **Large Datasets (200+ scenes)**: Performance is automatically optimized
- **Navigation**: Move gradually between scenes for best experience
- **Browser**: Close other tabs if experiencing lag
- **Hardware**: Ensure graphics drivers are up to date

## 🗺️ MiniMap Features

The interactive minimap includes advanced zoom-based hotspot filtering to reduce visual clutter and improve navigation clarity.

### Zoom-Based Hotspot Filtering

The minimap dynamically adjusts hotspot visibility based on zoom level to prevent overcrowding:

- **100% Zoom**: Only distant hotspots are shown (minimum distance of 6.0 units)
  - Ideal for overview navigation and identifying major areas
  - Reduces clutter in dense scene clusters

- **200% Zoom**: More hotspots appear (minimum distance of 3.5 units)
  - Balanced view showing moderate detail
  - Good for regional navigation

- **300% Zoom**: Even closer hotspots become visible (minimum distance of 1.0 units)
  - Detailed view for precise navigation
  - Shows most scene connections

- **400% Zoom**: Nearly all hotspots are visible (minimum distance of 0.5 units)
  - Maximum detail view
  - All scenes and connections visible

### MiniMap Controls

- **Zoom**: Mouse wheel to zoom in/out (50% - 400%)
- **Pan**: Click and drag to move around the map
- **Reset**: Double-click to reset zoom and pan
- **Minimize**: Click the minimize button to collapse the minimap

### Visual Indicators

- **Hotspot Counter**: Shows visible/total hotspots (e.g., "👁 5/12")
- **Zoom Level**: Displays current zoom percentage
- **Current Scene**: Red pulsing dot with direction indicator
- **Other Scenes**: Green dots for navigable scenes
- **Connection Lines**: Shows links between visible scenes only

### Smart Filtering Algorithm

The filtering system uses intelligent proximity detection:

1. **Distance Calculation**: Uses real 3D coordinates for accurate spacing
2. **Priority System**: Always shows current scene and nearby important locations
3. **Smooth Transitions**: Gradual hotspot appearance/disappearance during zoom
4. **Performance Optimized**: Efficient for projects with hundreds of scenes

## 🛡️ Security

- Environment variables are properly scoped
- No sensitive data in client-side code
- Regular dependency updates via Dependabot
- Security scanning in CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm run test:all`
5. Format code: `npm run format`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed

## 📚 Documentation

- [Setup Guide](docs/README.md) - Detailed setup instructions
- [Configuration Guide](docs/CONFIGURATION.md) - Configuration options
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🐛 Troubleshooting

Common issues and solutions:

### Configuration Generation Fails

```bash
# Check Python installation
python --version
python3 --version

# Install NumPy
pip install numpy
```

### Images Not Loading

- Verify images are in `public/images/`
- Check file naming matches CSV data
- Ensure proper file permissions

### Performance Issues

**Symptoms**: Laggy navigation, slow loading, or high memory usage

**Automatic Solutions**:
- Smart loading is enabled automatically for large datasets
- Use the Performance Monitor (top-right corner) to check status
- Click "Optimize Performance" button for manual cleanup

**Manual Solutions**:
- Reduce image file sizes (compress to 80-90% quality)
- Navigate gradually between scenes instead of jumping far distances
- Close other browser tabs to free up memory
- Check browser console for errors
- Update graphics drivers for better WebGL performance

**For Large Datasets (100+ scenes)**:
- Performance optimizations are automatically applied
- Expect 6-16 scenes loaded simultaneously (adaptive)
- Monitor shows performance status and memory usage

For more detailed troubleshooting, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Marzipano](https://www.marzipano.net/) - Panorama viewing library
- [Next.js](https://nextjs.org/) - React framework
- [Vercel](https://vercel.com/) - Deployment platform

## 📞 Support

If you encounter any issues or have questions:

1. Check the [documentation](docs/)
2. Search [existing issues](../../issues)
3. Create a [new issue](../../issues/new) with detailed information

---

**Happy panorama viewing! 🌍**
