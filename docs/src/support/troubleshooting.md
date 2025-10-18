# Troubleshooting

Common issues and solutions for API Studio.

## Installation Issues

### Python Version Compatibility
- **Issue**: Package installation fails with Python 3.13
- **Solution**: Use Python 3.11 or 3.12, or install with `--only-binary=all`

### Port Conflicts
- **Issue**: Ports 56173 or 58123 already in use
- **Solution**: Change ports in configuration files or stop conflicting services

## Connection Issues

### Backend Connection Failed
- **Issue**: Frontend can't connect to backend
- **Solution**: Ensure backend is running on port 58123 using `python start.py`

### CORS Errors
- **Issue**: Browser blocks requests due to CORS
- **Solution**: Verify FRONTEND_URL in backend .env file matches frontend URL

## Performance Issues

### Slow Response Times
- **Issue**: API requests are slow
- **Solution**: Check network connectivity, increase timeout settings

### Memory Usage
- **Issue**: High memory consumption
- **Solution**: Clear request history, reduce concurrent connections

*This page is under development. More solutions will be added.*