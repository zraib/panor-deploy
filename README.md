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

- **Image Optimization**: Use WebP format for panorama images
- **Lazy Loading**: Implement progressive loading for large scenes
- **Caching**: Configure appropriate cache headers
- **Bundle Analysis**: Use `npm run build` to analyze bundle size

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

- Reduce image file sizes
- Limit number of concurrent panoramas
- Check browser console for errors

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
